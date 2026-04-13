import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import { cache, Suspense } from "react";
import ProfileView from "../../components/ProfileView";
import SharePageClient from "../../components/SharePageClient";
import { Profile } from "../../types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const cachedFetchProfile = cache(
  async function fetchProfile(
    username: string,
  ): Promise<{ data: Profile | null; error: string | null }> {
    try {
      if (!SUPABASE_URL) return { data: null, error: "Config Missing" };
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const adminClient = createClient(
        SUPABASE_URL,
        serviceRoleKey || SUPABASE_ANON_KEY,
      );

      const { data: profile } = await adminClient
        .from("profiles")
        .select(
          "id, username, nickname, bio, avatar_url, followers_count, following_count, works_count, is_private, role",
        )
        .eq("is_private", false)
        .ilike("username", username)
        .maybeSingle();

      if (profile) {
        const [posts, lists, workLikes, artistLikes] = await Promise.all([
          adminClient
            .from("posts")
            .select(
              "*, works(slug, image_url, work_type, work_title, artist_name, work_year)",
            )
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(18),
          adminClient.rpc("get_user_lists", {
            p_user_id: profile.id,
            p_limit: 20,
            p_offset: 0,
          }),
          adminClient
            .from("work_likes")
            .select(
              "*, works(slug, image_url, work_type, work_title, artist_name, work_year)",
            )
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(30),
          adminClient
            .from("artist_likes")
            .select("*, artists(id, slug, name, profile_path, birth_date)")
            .eq("user_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        const combinedArchives = [
          ...(workLikes.data || []).map((item) => ({
            ...item,
            item_type: "work" as const,
            created_at: item.created_at,
          })),
          ...(artistLikes.data || []).map((item) => ({
            id: `artist-${item.artist_id}`,
            item_type: "artist" as const,
            artist_id: item.artist_id,
            artist_name: item.artists?.name,
            artist_profile_path: item.artists?.profile_path,
            artist_birth_date: item.artists?.birth_date,
            artist_slug: item.artists?.slug,
            created_at: item.created_at,
          })),
        ].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        return {
          data: {
            ...profile,
            initial_posts: posts.data || [],
            initial_lists: lists.data || [],
            initial_archives: combinedArchives,
          },
          error: null,
        };
      }

      return { data: null, error: "not_found" };
    } catch (err) {
      return { data: null, error: String(err) };
    }
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const { data } = await cachedFetchProfile(decodedUsername);

  let title = "TASH";
  let description = "창작물을 발견하고 기록하는 공간";
  let image = "https://open.tash.kr/icons/app_logo.png";

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
    other: {
      "apple-itunes-app": `app-id=6755390469, app-argument=https://open.tash.kr/open-app/u/${decodedUsername}`,
    },
  };
}

function ProfileSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-white pb-32 animate-pulse">
      <div className="mb-1 flex items-start justify-between px-[16px] pt-6 pb-2">
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-100" />
        </div>
        <div className="ml-4 h-[64px] w-[64px] rounded-full bg-gray-200" />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-0">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100" />
        ))}
      </div>
    </div>
  );
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const { data } = await cachedFetchProfile(decodedUsername);

  if (!data) {
    return (
      <SharePageClient type="home" id="">
        <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
          <h1 className="mb-3 text-xl font-bold tracking-tight">
            콘텐츠를 찾을 수 없습니다
          </h1>
          <p className="mb-10 text-[14px] text-gray-500">
            링크가 올바르지 않거나 삭제된 콘텐츠입니다.
          </p>

          <div className="link-trigger flex h-12 cursor-pointer items-center justify-center rounded-full bg-black px-8 text-[14px] font-semibold text-white transition-transform active:scale-95">
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
