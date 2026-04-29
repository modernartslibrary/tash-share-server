import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { cache, Suspense } from "react";
import ProfileView from "../../components/ProfileView";
import SharePageClient from "../../components/SharePageClient";
import { Profile } from "../../types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const PROFILE_CACHE_REVALIDATE_SECONDS = 300;

async function fetchProfile(
  username: string,
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return { data: null, error: "Config Missing" };
    }
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: profileData, error } = await client.rpc(
      "get_public_profile_by_username",
      {
        p_username: username,
      },
    );

    if (error) {
      return { data: null, error: error.message };
    }

    if (!profileData) {
      return { data: null, error: "not_found" };
    }

    return { data: profileData as Profile, error: null };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}

const cachedFetchProfile = cache(
  async function fetchCachedProfile(username: string) {
    return unstable_cache(
      () => fetchProfile(username),
      ['share-profile', username],
      {
        revalidate: PROFILE_CACHE_REVALIDATE_SECONDS,
        tags: [`profile:${username}`],
      },
    )();
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
  let image = "https://link.tash.kr/icons/app_logo.png";

  if (data) {
    title = `${data.username}님의 프로필`;
    description = data.bio || description;
    image = data.avatar_url || image;
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image }],
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    other: {
      "apple-itunes-app": `app-id=6755390469, app-argument=https://open.tash.kr/open-app/profile/${decodedUsername}`,
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
      <SharePageClient type="profile" id={decodedUsername} slug={decodedUsername}>
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
