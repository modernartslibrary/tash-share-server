import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import { cache } from "react";
import { redirect } from "next/navigation";
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
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        return { data: null, error: "Config Missing" };
      }
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const normalizedIdentifier = ["movie", "tv", "track", "album", "book"].includes(identifier)
        ? "work"
        : identifier;

      let data: any = null;
      let errorMessage: string | null = null;

      switch (normalizedIdentifier) {
        case 'work': {
          const { data: workData, error } = await client.rpc("get_public_work_by_slug", {
            p_slug: slug,
          });
          data = workData;
          errorMessage = error?.message || null;
          break;
        }
        case 'artist': {
          const { data: artistData, error } = await client.rpc("get_public_artist_by_slug", {
            p_slug: slug,
          });
          data = artistData;
          errorMessage = error?.message || null;
          break;
        }
        case 'post': {
          const { data: postData, error } = await client.rpc("get_public_post_by_slug", {
            p_slug: slug,
          });
          data = postData;
          errorMessage = error?.message || null;
          break;
        }
        case 'list': {
          const { data: listData, error } = await client.rpc("get_public_list_by_slug", {
            p_slug: slug,
          });
          data = listData;
          errorMessage = error?.message || null;
          break;
        }
        default:
          return { data: null, error: "Unsupported Identifier" };
      }

      if (errorMessage) return { data: null, error: errorMessage };
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
  const normalizedIdentifier = ["movie", "tv", "track", "album", "book"].includes(identifier)
    ? "work"
    : identifier;

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

  const appPath = `/open-app/${normalizedIdentifier}/${slug}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    other: {
      'apple-itunes-app': `app-id=6755390469, app-argument=https://open.tash.kr${appPath}`
    }
  };
}

export default async function SharedItemPage({ params }: { params: Promise<{ identifier: string; slug: string }> }) {
  const { identifier, slug } = await params;
  const { data } = await cachedFetchContent(identifier, slug);
  const normalizedIdentifier = ["movie", "tv", "track", "album", "book"].includes(identifier)
    ? "work"
    : identifier;

  if (normalizedIdentifier === "work" && identifier !== "work") {
    redirect(`/work/${encodeURIComponent(slug)}`);
  }

  if (!data) {
    return (
      <SharePageClient
        type={normalizedIdentifier}
        id={slug}
        slug={slug}
      >
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-5 text-center">
          <h1 className="text-xl font-bold mb-3 tracking-tight">콘텐츠를 찾을 수 없습니다</h1>
          <p className="text-[14px] text-gray-500 mb-10">링크가 올바르지 않거나 삭제된 콘텐츠입니다.</p>
          
          <div className="link-trigger px-8 h-12 rounded-full bg-black text-white flex items-center justify-center active:scale-95 transition-transform text-[14px] font-semibold cursor-pointer">
            앱에서 열기
          </div>
        </div>
      </SharePageClient>
    );
  }

  return (
    <SharePageClient type={normalizedIdentifier} id={slug} slug={slug}>
      {["work", "movie", "tv", "track", "album", "book"].includes(identifier) && <WorkView data={data as Work} />}
      {identifier === 'post' && <PostView data={data as Post} />}
      {identifier === 'artist' && <ArtistView data={data as Artist} />}
      {identifier === 'list' && <ListView data={data as List} />}
    </SharePageClient>
  );
}
