import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import ProfileView from "../../components/ProfileView";
import WorkView from "../../components/WorkView";
import ArtistView from "../../components/ArtistView";
import SharePageClient from "../../components/SharePageClient";
import { Work, Post, List, Profile, Artist, TASHData, Credit, TASHComment } from "../../types";


export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import Link from "next/link";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);




async function fetchContent(type: string, id: string): Promise<{ data: TASHData | null; error: string | null }> {
  try {
    const decodedId = decodeURIComponent(id).normalize('NFC');
    console.log(`[fetchContent] type: ${type}, id: ${decodedId}`);

    if (!SUPABASE_URL) return { data: null, error: "Config Missing" };

    const TASH_INTERNAL_SECRET = 'tash_sync_secret_2026_redacted';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = serviceRoleKey ? `Bearer ${serviceRoleKey}` : `Bearer ${SUPABASE_ANON_KEY}`;

    // 새로운 통합 엣지 펑션 호출
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-share-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-tash-internal-key': TASH_INTERNAL_SECRET,
      },
      body: JSON.stringify({ type, id: decodedId }),
    });

    let data = null;
    if (response.ok) {
        const result = await response.json();
        data = result.data || result;
    } else {
        const errText = await response.text();
        console.warn(`[fetchContent] Edge Function returned error ${response.status}:`, errText);
    }

    // 폴백: Edge Function이 댓글을 반환하지 않는 경우 (미배포 등), 서버 사이드에서 직접 조회
    if (type === 'post' && data && !data.comments) {
      console.log(`[fetchContent] Post missing comments, falling back to direct DB query`);
      const { data: directComments } = await supabase
        .from("post_comments")
        .select("*, profiles(*)")
        .eq("post_id", id)
        .order("created_at", { ascending: true });

      if (directComments) {
        // 계층 구조 생성
        const commentMap = new Map();
        const rootComments: any[] = [];
        directComments.forEach((c: any) => {
          c.replies = [];
          commentMap.set(c.id, c);
        });
        directComments.forEach((c: any) => {
          if (c.parent_id && commentMap.has(c.parent_id)) {
            commentMap.get(c.parent_id).replies.push(c);
          } else {
            rootComments.push(c);
          }
        });
        data.comments = rootComments;
      }
    }

    // 폴백: Edge Function이 프로필 정보를 반환하지 않는 경우 (UUID 정규식 오류 등), 서버 사이드에서 직접 조회
    if (type === 'profile' && (!data || !data.username)) {
      console.log(`[fetchContent] Profile failed, falling back to direct DB query: ${id}`);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = supabase.from("profiles").select("*");
      if (isUUID) query = query.eq("id", id);
      else {
        const cleanUsername = id.startsWith('@') ? id.substring(1) : id;
        query = query.ilike("username", cleanUsername);
      }
      
      const { data: directProfile } = await query.single();
      if (directProfile) {
        // 초기 데이터(포스트 등) 병렬 로드
        const [posts, lists, archives] = await Promise.all([
          supabase.from("posts").select("*, works(image_url, work_type, work_title, artist_name, work_year)").eq("user_id", directProfile.id).order("created_at", { ascending: false }).limit(12),
          supabase.rpc("get_user_lists", { p_user_id: directProfile.id, p_limit: 6, p_offset: 0 }),
          supabase.from("work_likes").select("*, works(image_url, work_type, work_title, artist_name, work_year)").eq("user_id", directProfile.id).order("created_at", { ascending: false }).limit(12)
        ]);

        data = {
          ...directProfile,
          initial_posts: posts.data || [],
          initial_lists: lists.data || [],
          initial_archives: archives.data || []
        };
      }
    }

    return { data, error: null };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[fetchContent] Exception:`, errorMessage);
    return { data: null, error: errorMessage };
  }
}


export async function generateMetadata({ params }: { params: Promise<{ type: string; id: string | string[] }> }): Promise<Metadata> {
  const { type, id } = await params;
  const resolvedId = Array.isArray(id) ? id.join('/') : id;
  const { data } = await fetchContent(type, resolvedId);

  let title = "TASH";
  let description = "창작물을 발견하고 기록하는 공간";
  let image = "https://link.tash.kr/icons/app_logo.png";

  if (data) {
    const workTypes = ["work", "movie", "tv", "track", "album", "book"];
    if (workTypes.includes(type)) {
      const work = data as Work;
      title = `${work.work_title} - ${work.artist_name}`;
      description = work.biography || `${work.artist_name}의 ${work.work_type === 'track' ? '곡' : '작품'} '${work.work_title}'`;
      image = work.image_url || image;
    } else if (type === "post") {
      title = `${(data as Post).profiles?.username || "TASH 유저"}님의 기록`;
      description = (data as Post).content;
      image = (data as Post).works?.image_url || image;
    } else if (type === "profile") {
      title = `${(data as Profile).username}님의 프로필`;
      description = (data as Profile).bio || description;
      image = (data as Profile).avatar_url || image;
    } else if (type === "artist") {
      title = (data as Artist).name;
      image = (data as Artist).profile_path ? `https://image.tmdb.org/t/p/w500${(data as Artist).profile_path}` : image;
    } else if (type === "list") {
      title = (data as List).title;
      image = (data as List).cover_url || image;
    }
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
          width: 500,
          height: 500,
          alt: title,
        }
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    icons: {
      apple: image,
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ type: string; id: string | string[] }> }) {
  const resolvedParams = await params;
  const { type, id } = resolvedParams;
  const resolvedId = Array.isArray(id) ? id.join('/') : id;
  const { data } = await fetchContent(type, resolvedId);

  // Unify link system: Redirect to canonical TASH ID if we matched a suffix or fallback.
  if (data && type === 'work' && data.id && data.id !== resolvedId) {
    if (data.id.endsWith(resolvedId) || resolvedId === data.id.split(':').pop()) {
      console.log(`[SharePage] Redirecting to canonical ID: ${data.id}`);
      // redirect(`/work/${data.id}`);
    }
  }

  if (!data) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-xl font-bold mb-4">정보를 찾을 수 없습니다.</h1>
        <div className="mt-8 text-blue-500 underline link-trigger cursor-pointer">홈으로 이동</div>
      </div>
    );
  }
  return (
    <SharePageClient type={type} id={resolvedId}>
      {["work", "movie", "tv", "track", "album", "book"].includes(type) && <WorkView data={data as Work} />}
      {type === 'post' && <PostLayout data={data as Post} />}
      {type === 'profile' && <ProfileView data={data as Profile} />}
      {type === 'artist' && <ArtistView data={data as Artist} />}
      {type === 'list' && <ListLayout data={data as List} />}
    </SharePageClient>
  );
}

// Helper for PostLayout
function getCategoryLabel(type: string | undefined) {
  if (!type) return '작품';
  switch (type.toLowerCase()) {
    case 'movie': return '영화';
    case 'tv': return 'TV 프로그램';
    case 'album': return '앨범';
    case 'track': return '곡';
    case 'book': return '책';
    default: return '작품';
  }
}

function formatTimeAgo(dateString: string | undefined) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`;
  return `${Math.floor(diffInSeconds / 31536000)}년 전`;
}

function PostLayout({ data }: { data: Post }) {
  return (
    <div className="py-2 tracking-[-0.03em]">
      {/* User Info Section */}
      <div className="flex items-center mb-4 px-5">
        <Link href={`/profile/${data.user_id}`} className="flex items-center">
          <img
            src={data.profiles?.avatar_url || '/icons/default_profile.jpg'}
            className="w-10 h-10 rounded-full border border-gray-100 object-cover mr-3"
            alt="avatar"
          />
          <div className="flex items-center gap-2">
            <span className="font-medium text-[17px] text-black leading-tight">{data.profiles?.username}</span>
            <span className="text-[13px] text-[#A0A0A0]">{formatTimeAgo(data.created_at)}</span>
          </div>
        </Link>
      </div>

      {/* Work Preview Section (No box, No shadow, No radius) */}
      <div className="flex items-center mb-1 px-5 gap-4">
        <Link href={`/${data.works?.work_type}/${data.works?.id}`} className="flex items-center gap-4 w-full">
          <div className="w-20 h-20 flex-shrink-0 overflow-hidden">
            <img
              src={data.works?.image_url}
              className="w-full h-full object-cover block"
              alt="work"
            />
          </div>

          <div className="flex flex-col justify-center py-1">
            <span className="font-medium text-[16px] text-black leading-tight mb-1 line-clamp-2">
              {data.works?.work_title}
            </span>
            <p className="text-[13px] text-[#8E8E8E] font-normal mb-1.5 leading-tight">
              {getCategoryLabel(data.works?.work_type)} · {data.works?.artist_name}{data.works?.work_year ? `, ${data.works.work_year}` : ''}
            </p>
            {data.rating && (
              <div className="flex items-center gap-1.5">
                <img src="/icons/star_icon.png" className="w-3 h-3 object-contain" alt="star" />
                <span className="text-[12px] font-normal text-black">{data.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </Link>
      </div>

      {/* Content Section */}
      <div className="text-[16px] leading-[1.0] whitespace-pre-wrap text-[#1A1A1A] px-5 mb-2 tracking-[-0.04em]">
        {data.content}
      </div>

      {/* Stats Section */}
      <div className="flex items-center gap-4 px-5 mb-4">
        <div className="flex items-center gap-1.5 link-trigger cursor-pointer">
          <img src="/icons/like_button_no.png" className="w-[20px] h-[20px] object-contain" alt="like" />
          <span className="text-[14px] font-medium text-black">{data.likes_count || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 link-trigger cursor-pointer">
          <img src="/icons/post_comment.png" className="w-[20px] h-[20px] object-contain" alt="comment icon" />
          <span className="text-[14px] font-medium text-black">{data.comments_count || 0}</span>
        </div>
      </div>

      {/* Comments Section */}
      <div className="px-5 pt-2 pb-12">
        <h3 className="text-[17px] font-medium text-black mb-2">댓글</h3>

        {data.comments && data.comments.length > 0 ? (
          <div className="flex flex-col gap-6">
            {data.comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-gray-400 py-4 text-center">첫 댓글을 남겨보세요.</p>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: TASHComment }) {
  return (
    <div className="flex flex-col">
      <div className="flex gap-3">
        <Link href={`/profile/${comment.user_id}`}>
          <img
            src={comment.profiles?.avatar_url || '/icons/default_profile.jpg'}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            alt="avatar"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href={`/profile/${comment.user_id}`}>
              <span className="font-medium text-[15px] text-black">{comment.profiles?.username}</span>
            </Link>
            <span className="text-[12px] text-[#A0A0A0] font-normal">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="text-[15px] text-[#1A1A1A] leading-normal mb-2 whitespace-pre-wrap block tracking-tighter">
            {comment.content}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 link-trigger cursor-pointer">
              <img src="/icons/like_button_no.png" className="w-[14px] h-[14px] object-contain" alt="like" />
              <span className="text-[13px] font-medium text-[#666]">{comment.likes_count || 0}</span>
            </div>
            <button className="text-[13px] font-medium text-[#666] link-trigger">답글 달기</button>
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-12 mt-6 flex flex-col gap-6 relative">
          <div className="absolute left-[-20px] top-0 bottom-7 w-[1px] bg-gray-100" />
          {comment.replies.map((reply: TASHComment) => (
            <div key={reply.id} className="flex gap-3 relative">
              <Link href={`/profile/${reply.user_id}`}>
                <img
                  src={reply.profiles?.avatar_url || '/icons/default_profile.jpg'}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  alt="avatar"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/profile/${reply.user_id}`}>
                    <span className="font-medium text-[15px] text-black">{reply.profiles?.username}</span>
                  </Link>
                  <span className="text-[12px] text-[#A0A0A0] font-normal">{formatTimeAgo(reply.created_at)}</span>
                </div>
                <p className="text-[15px] text-[#1A1A1A] leading-normal mb-2 whitespace-pre-wrap block tracking-tighter">
                  {reply.content}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 link-trigger cursor-pointer">
                    <img src="/icons/like_button_no.png" className="w-[14px] h-[14px] object-contain" alt="like" />
                    <span className="text-[13px] font-medium text-[#666]">{reply.likes_count || 0}</span>
                  </div>
                  <button className="text-[13px] font-medium text-[#666] link-trigger">답글 달기</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function ListLayout({ data }: { data: List }) {
  return (
    <div className="flex flex-col items-center py-8 link-trigger cursor-pointer active:opacity-80 transition-opacity">
      <div className="w-48 aspect-square mb-8 relative pointer-events-none">
        <img src={data.cover_url} className="w-full h-full object-cover border border-gray-50" alt={data.title || "list"} />
      </div>
      <h2 className="text-2xl font-extrabold mb-2 pointer-events-none">{data.title}</h2>
      <p className="text-gray-400 text-sm pointer-events-none">Created by {data.profiles?.username}</p>
    </div>
  );
}
