import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import { cache } from "react";
import WorkView from "../../components/WorkView";
import ArtistView from "../../components/ArtistView";
import ListView from "../../components/ListView";
import PostView from "../../components/PostView";
import SharePageClient from "../../components/SharePageClient";
import { Work, Post, List, Artist, TASHData } from "../../types";
import { resolveImageUrl, resolveProfileImageUrl } from "../../utils/imageUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const cachedFetchContent = cache(
  async function fetchContent(identifier: string, slug: string): Promise<{ data: TASHData | null; error: string | null }> {
    try {
      if (!SUPABASE_URL) return { data: null, error: "Config Missing" };
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const adminClient = createClient(SUPABASE_URL, serviceRoleKey || SUPABASE_ANON_KEY);

      let data: any = null;
      console.log(`[fetchContent] Querying by slug - identifier: ${identifier}, slug: ${slug}`);

      switch (identifier) {
        case 'work':
        case 'movie':
        case 'tv':
        case 'track':
        case 'album':
        case 'book': {
          let query = adminClient
            .from("works")
            .select(`
              *,
              work_artist (
                role,
                artist_order,
                character_name,
                artists (
                  id,
                  slug,
                  name,
                  profile_path
                )
              )
            `)
            .eq("slug", slug);

          if (identifier !== 'work') {
            query = query.eq("work_type", identifier);
          }

          const { data: work } = await query.maybeSingle();
          
          if (work && work.work_artist) {
            work.credits = (work.work_artist as any[]).map((wa: any) => ({
              id: wa.artists?.id || '',
              slug: wa.artists?.slug,
              name: wa.artists?.name || 'Unknown',
              profile_path: wa.artists?.profile_path,
              role: wa.role,
              character_name: wa.character_name
            }));
          }
          data = work;
          break;
        }

        case 'artist': {
          // Artist는 RPC 대신 직접 테이블 조회 (slug 컬럼 사용)
          // RPC get_artist_share_payload는 id 기반이므로 slug 대응이 필요할 수 있으나,
          // 여기서는 우선 slug로 검색하여 id를 얻은 뒤 RPC를 호출하거나, 직접 조인합니다.
          const { data: artistInfo } = await adminClient
            .from("artists")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          
          if (artistInfo) {
            const { data: artistPayload } = await adminClient
              .rpc("get_artist_share_payload", { p_artist_id: artistInfo.id });
            
            // RPC 결과에 slug가 없을 수 있으므로 직접 주입
            if (artistPayload) {
              artistPayload.slug = slug;
            }
            data = artistPayload;
          }
          break;
        }

        case 'post': {
          const { data: post } = await adminClient
            .from("posts")
            .select("*, profiles!inner(*), works(*)")
            .eq("slug", slug)
            .eq("profiles.is_private", false)
            .maybeSingle();

          if (post) {
            const { data: comments } = await adminClient
              .from("post_comments")
              .select("*, profiles!inner(*)")
              .eq("post_id", post.id)
              .eq("profiles.is_private", false)
              .order("created_at", { ascending: true });

            if (comments) {
              const commentMap = new Map();
              const rootComments: any[] = [];
              comments.forEach((c: any) => {
                c.replies = [];
                commentMap.set(c.id, c);
              });
              comments.forEach((c: any) => {
                if (c.parent_id && commentMap.has(c.parent_id)) {
                  commentMap.get(c.parent_id).replies.push(c);
                } else {
                  rootComments.push(c);
                }
              });
              post.comments = rootComments;
            }
            data = post;
          }
          break;
        }

        case 'list': {
          const { data: list } = await adminClient
            .from("lists")
            .select("*, profiles!inner(*)")
            .eq("slug", slug)
            .eq("profiles.is_private", false)
            .maybeSingle();

          if (list) {
            const { data: listItems } = await adminClient
              .from("list_items")
              .select("*, works(*)")
              .eq("list_id", list.id)
              .order("order_index", { ascending: true });

            if (listItems) {
              list.items = listItems.map((item: any) => item.works).filter(Boolean);
              const workCounts: Record<string, number> = {};
              list.items.forEach((work: any) => {
                if (work.work_type) {
                  workCounts[work.work_type] = (workCounts[work.work_type] || 0) + 1;
                }
              });
              list.work_counts = workCounts;
            }
            data = list;
          }
          break;
        }
      }

      if (!data) return { data: null, error: 'not_found' };
      return { data, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  }
);

export async function generateMetadata({ params }: { params: Promise<{ identifier: string; slug: string }> }): Promise<Metadata> {
  const { identifier, slug } = await params;
  const { data } = await cachedFetchContent(identifier, slug);

  let title = "TASH";
  let description = "창작물을 발견하고 기록하는 공간";
  let image = "https://link.tash.kr/icons/app_logo.png";

  if (data) {
    if (["work", "movie", "tv", "track", "album", "book"].includes(identifier)) {
      const work = data as Work;
      title = `${work.work_title} - ${work.artist_name}`;
      description = work.biography || `${work.artist_name}의 '${work.work_title}'`;
      image = resolveImageUrl(work.image_url) || image;
    } else if (identifier === "post") {
      const post = data as Post;
      title = `${post.profiles?.username || "TASH 유저"}님의 기록`;
      description = post.content || description;
      image = resolveImageUrl(post.works?.image_url) || image;
    } else if (identifier === "artist") {
      const artist = data as Artist;
      title = artist.name;
      image = resolveProfileImageUrl(artist.profile_path) || image;
    } else if (identifier === "list") {
      const list = data as List;
      title = list.title;
      description = list.description || description;
      image = resolveImageUrl(list.cover_url) || image;
    }
  }

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedItemPage({ params }: { params: Promise<{ identifier: string; slug: string }> }) {
  const { identifier, slug } = await params;
  const { data } = await cachedFetchContent(identifier, slug);

  if (!data) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-xl font-bold mb-4">콘텐츠를 찾을 수 없습니다.</h1>
        <div className="mt-8 text-blue-500 underline cursor-pointer">홈으로 이동</div>
      </div>
    );
  }

  return (
    <SharePageClient type={identifier} id={slug}>
      {["work", "movie", "tv", "track", "album", "book"].includes(identifier) && <WorkView data={data as Work} />}
      {identifier === 'post' && <PostView data={data as Post} />}
      {identifier === 'artist' && <ArtistView data={data as Artist} />}
      {identifier === 'list' && <ListView data={data as List} />}
    </SharePageClient>
  );
}
