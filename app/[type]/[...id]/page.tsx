import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import ProfileView from "../../components/ProfileView";
import WorkView from "../../components/WorkView";
import ArtistView from "../../components/ArtistView";
import ListView from "../../components/ListView";
import PostView from "../../components/PostView";
import SharePageClient from "../../components/SharePageClient";
import { Work, Post, List, Profile, Artist, TASHData } from "../../types";


export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

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
      console.log(`[fetchContent] Edge Function success for ${type}: ${decodedId}`);
    } else {
      const errText = await response.text();
      console.warn(`[fetchContent] Edge Function failed (${response.status}):`, errText);
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
      console.log(`[fetchContent] Profile missing/failed, starting direct DB query: ${decodedId}`);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);
      let query = supabase.from("profiles").select("*");
      if (isUUID) query = query.eq("id", decodedId);
      else {
        const cleanUsername = decodedId.startsWith('@') ? decodedId.substring(1) : decodedId;
        query = query.ilike("username", cleanUsername);
      }

      const { data: directProfile, error: queryError } = await query.maybeSingle();

      if (queryError) {
        console.error(`[fetchContent] Direct query error:`, queryError);
      }

      if (directProfile) {
        console.log(`[fetchContent] Direct profile found: ${directProfile.username}`);
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
      } else {
        console.warn(`[fetchContent] No profile found even in direct query for: ${decodedId}`);
      }
    }

    // 폴백: Edge Function이 리스트 아이템을 반환하지 않는 경우, 서버 사이드에서 직접 조회
    if (type === 'list' && data && !data.items) {
      console.log(`[fetchContent] List items missing, falling back to direct DB query: ${id}`);
      const { data: listItems } = await supabase
        .from("list_items")
        .select("*, works(*)")
        .eq("list_id", id)
        .order("order_index", { ascending: true });

      if (listItems) {
        data.items = listItems.map((item: any) => item.works).filter(Boolean);

        // work_counts 계산
        const workCounts: Record<string, number> = {};
        data.items.forEach((work: any) => {
          if (work.work_type) {
            workCounts[work.work_type] = (workCounts[work.work_type] || 0) + 1;
          }
        });
        data.work_counts = workCounts;
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
      {type === 'post' && <PostView data={data as Post} />}
      {type === 'profile' && (
        <Suspense fallback={null}>
          <ProfileView data={data as Profile} />
        </Suspense>
      )}
      {type === 'artist' && <ArtistView data={data as Artist} />}
      {type === 'list' && <ListView data={data as List} />}
    </SharePageClient>
  );
}

