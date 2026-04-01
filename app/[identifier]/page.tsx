import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import { cache, Suspense } from "react";
import ProfileView from "../components/ProfileView";
import SharePageClient from "../components/SharePageClient";
import { Profile, TASHData } from "../types";
import { resolveImageUrl } from "../utils/imageUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const RESERVED_TYPES = ['post', 'list', 'movie', 'tv', 'album', 'track', 'book', 'artist', 'work'];

const cachedFetchProfile = cache(
  async function fetchProfile(username: string): Promise<{ data: Profile | null; error: string | null }> {
    try {
      if (RESERVED_TYPES.includes(username.toLowerCase())) {
        return { data: null, error: 'reserved_keyword' };
      }
      if (!SUPABASE_URL) return { data: null, error: "Config Missing" };
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const adminClient = createClient(SUPABASE_URL, serviceRoleKey || SUPABASE_ANON_KEY);

      console.log(`[fetchProfile] Querying username: ${username}`);
      
      const { data: profile } = await adminClient
        .from("profiles")
        .select("*")
        .eq("is_private", false)
        .ilike("username", username)
        .maybeSingle();

      if (profile) {
        const [posts, lists, workLikes, artistLikes] = await Promise.all([
          adminClient
            .from("posts")
            .select("*, works(slug, image_url, work_type, work_title, artist_name, work_year)")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(18),
          adminClient.rpc("get_user_lists", { p_user_id: profile.id, p_limit: 20, p_offset: 0 }),
          adminClient
            .from("work_likes")
            .select("*, works(slug, image_url, work_type, work_title, artist_name, work_year)")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(30),
          adminClient
            .from("artist_likes")
            .select("*, artists(id, slug, name, profile_path, birth_date)")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(20)
        ]);

        const combinedArchives = [
          ...(workLikes.data || []).map(item => ({
            ...item,
            item_type: 'work' as const,
            created_at: item.created_at
          })),
          ...(artistLikes.data || []).map(item => ({
            id: `artist-${item.artist_id}`,
            item_type: 'artist' as const,
            artist_id: item.artist_id,
            artist_name: item.artists?.name,
            artist_profile_path: item.artists?.profile_path,
            artist_birth_date: item.artists?.birth_date,
            artist_slug: item.artists?.slug,
            created_at: item.created_at
          }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return {
          data: {
            ...profile,
            initial_posts: posts.data || [],
            initial_lists: lists.data || [],
            initial_archives: combinedArchives
          },
          error: null
        };
      }

      return { data: null, error: 'not_found' };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  }
);

export async function generateMetadata({ params }: { params: Promise<{ identifier: string }> }): Promise<Metadata> {
  const { identifier } = await params;
  const decodedIdentifier = decodeURIComponent(identifier);
  
  if (RESERVED_TYPES.includes(decodedIdentifier.toLowerCase())) {
    return { title: "TASH" };
  }
  
  const { data } = await cachedFetchProfile(decodedIdentifier);

  let title = "TASH";
  let description = "창작물을 발견하고 기록하는 공간";
  let image = "https://link.tash.kr/icons/app_logo.png";

  if (data) {
    title = `${data.username}님의 프로필`;
    description = data.bio || description;
    image = data.avatar_url || image;
  }

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }], type: "website" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col bg-white min-h-screen pb-32 animate-pulse">
      <div className="flex justify-between items-start pt-6 pb-2 px-[16px] mb-1">
        <div className="flex flex-col flex-1 gap-2">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-100 rounded" />
        </div>
        <div className="w-[64px] h-[64px] rounded-full bg-gray-200 ml-4" />
      </div>
      <div className="grid grid-cols-3 gap-0 mt-8">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = await params;
  const decodedIdentifier = decodeURIComponent(identifier);
  const { data } = await cachedFetchProfile(decodedIdentifier);

  if (!data) {
    return (
      <SharePageClient type="error" id="none">
        <div className="p-20 text-center flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-xl font-bold mb-4">콘텐츠를 찾을 수 없습니다.</h1>
          <div className="mt-8 text-blue-500 underline cursor-pointer link-trigger">
            앱에서 열기
          </div>
        </div>
      </SharePageClient>
    );
  }

  return (
    <SharePageClient type="profile" id={data.username}>
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileView data={data} />
      </Suspense>
    </SharePageClient>
  );
}
