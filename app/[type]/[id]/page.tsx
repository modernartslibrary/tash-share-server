import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import ProfileView from "../../components/ProfileView";
import AppActionButton from "../../components/AppActionButton";
import Link from "next/link";
import { Work, Post, List, Profile, Artist, TASHData } from "../../types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchContent(type: string, id: string): Promise<{ data: TASHData | null; error: string | null }> {
  const decodedId = decodeURIComponent(id);
  
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { data: null, error: "Config Missing" };

    let query;
    if (type === "work") {
      query = supabase.from("works").select("*").eq("id", decodedId);
    } else if (type === "post") {
      query = supabase.from("posts").select("*, profiles(*), works(*)").eq("id", decodedId);
    } else if (type === "profile") {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);
      
      let profileRes;
      if (isUUID) {
        profileRes = await supabase.from("profiles").select("*").eq("id", decodedId).single();
      } else {
        const cleanUsername = decodedId.startsWith('@') ? decodedId.substring(1) : decodedId;
        profileRes = await supabase.from("profiles").select("*").ilike("username", cleanUsername).single();
      }

      if (profileRes.error) return { data: null, error: profileRes.error.message };

      const followersPromise = supabase.from("follows").select("*", { count: 'exact', head: true }).eq("following_id", profileRes.data.id);
      const followingPromise = supabase.from("follows").select("*", { count: 'exact', head: true }).eq("follower_id", profileRes.data.id);
      const worksCountPromise = supabase.from("work_likes").select("*", { count: 'exact', head: true }).eq("user_id", profileRes.data.id);
      const postsPromise = supabase.from("posts").select("*, works(image_url, work_type, work_title, artist_name, work_year)").eq("user_id", profileRes.data.id).order("created_at", { ascending: false }).limit(12);
      const listsPromise = supabase.from("lists").select("*").eq("user_id", profileRes.data.id).order("created_at", { ascending: false }).limit(6);
      const archivesPromise = supabase.from("work_likes").select("*, works(image_url, work_type, work_title, artist_name, work_year)").eq("user_id", profileRes.data.id).order("created_at", { ascending: false }).limit(12);

      const results = await Promise.all([
        followersPromise, followingPromise, worksCountPromise, postsPromise, listsPromise, archivesPromise
      ]);

      const postsRes = results[3];
      const listsRes = results[4];
      const archivesRes = results[5];

      return {
        data: {
          ...profileRes.data,
          followers_count: profileRes.data.followers_count || 0,
          following_count: profileRes.data.following_count || 0,
          works_count: profileRes.data.works_count || 0,
          initial_posts: postsRes.data || [],
          initial_lists: listsRes.data || [],
          initial_archives: archivesRes.data || []
        },
        error: null
      };
    } else if (type === "artist") {
      query = supabase.from("artists").select("*").eq("id", decodedId);
    } else if (type === "list") {
      query = supabase.from("lists").select("*, profiles(*)").eq("id", decodedId);
    } else {
      return { data: null, error: `Invalid Type: ${type}` };
    }
    
    if (query) {
      const { data, error } = await query.single();
      return { data, error: error?.message || null };
    }
    return { data: null, error: "Empty Query" };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { data: null, error: errorMessage };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ type: string; id: string }> }): Promise<Metadata> {
  const { type, id } = await params;
  const { data } = await fetchContent(type, id);

  let title = "TASH";
  let description = "창작물을 발견하고 기록하는 공간";
  let image = "https://tash.kr/logo.png";

  if (data) {
    if (type === "work") {
      title = (data as Work).work_title;
      image = (data as Work).image_url || image;
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
      images: [image],
      type: "website",
    },
  };
}

export default async function SharePage({ params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  const { data } = await fetchContent(type, id);

  if (!data) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-xl font-bold mb-4">정보를 찾을 수 없습니다.</h1>
        <Link href="/" className="mt-8 text-blue-500 underline">홈으로 이동</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-24">
      {type !== 'profile' && (
        <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md flex items-center px-6 z-50 border-b border-gray-50">
          <img src="/icons/app_logo.png" className="h-6 object-contain" alt="TASH" />
        </header>
      )}

      <main className={`${type === 'profile' ? 'pt-0' : 'pt-14'} px-0 max-w-2xl mx-auto`}>
        {type === 'work' && <WorkLayout data={data as Work} />}
        {type === 'post' && <PostLayout data={data as Post} />}
        {type === 'profile' && <ProfileView data={data as Profile} />}
        {type === 'artist' && <ArtistLayout data={data as Artist} />}
        {type === 'list' && <ListLayout data={data as List} />}
      </main>

      {type !== 'profile' && <AppActionButton type={type} id={id} />}
    </div>
  );
}

function WorkLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col items-center py-8">
      <div className="w-[73%] aspect-[2/3] mb-8 relative">
        <img src={data.image_url} className="w-full h-full object-cover rounded-2xl border border-gray-100" alt={data.work_title || "work"} />
      </div>
      <h2 className="text-2xl font-black mb-1 text-center px-4 leading-tight">{data.work_title}</h2>
      <p className="text-gray-500 font-semibold mb-8">{data.display_artist_name || data.artist_name || "TASH"}</p>
      {data.biography && (
        <div className="w-full text-left bg-gray-50/70 p-7 rounded-[28px] text-gray-700 leading-relaxed tracking-tight whitespace-pre-wrap text-[15px]">
          {data.biography}
        </div>
      )}
    </div>
  );
}

function PostLayout({ data }: { data: Post }) {
  return (
    <div className="py-6">
      <div className="flex items-center mb-6 px-4">
        <img src={data.profiles?.avatar_url || '/icons/default_profile.jpg'} className="w-10 h-10 rounded-full border border-gray-100 object-cover mr-3" alt="avatar" />
        <span className="font-bold text-[17px]">{data.profiles?.username}</span>
      </div>

      <div className="bg-[#F8F9FA] rounded-2xl p-4 flex items-center mb-6 border border-gray-100/50 mx-4">
        <img src={data.works?.image_url} className="w-14 h-20 rounded-lg object-cover mr-4 border border-gray-200/30" alt="work" />
        <div className="flex flex-col">
          <span className="font-bold text-[15px] line-clamp-1 mb-0.5">{data.works?.work_title}</span>
          <span className="text-xs text-gray-400 font-medium">{data.works?.artist_name}</span>
        </div>
      </div>

      <div className="text-[17px] leading-relaxed whitespace-pre-wrap text-[#1A1A1A] px-5">
        {data.content}
      </div>
    </div>
  );
}

function ArtistLayout({ data }: { data: { name: string; profile_path?: string; biography?: string } }) {
    const imageUrl = data.profile_path ? `https://image.tmdb.org/t/p/w500${data.profile_path}` : '/icons/default_profile.jpg';
    return (
      <div className="flex flex-col items-center py-10">
        <img src={imageUrl} className="w-40 h-40 rounded-full object-cover mb-8 border-4 border-white ring-1 ring-gray-100" alt={data.name || "artist"} />
        <h2 className="text-2xl font-black mb-8">{data.name}</h2>
        {data.biography && (
          <div className="w-full text-left bg-gray-50/70 p-7 rounded-[28px] text-gray-700 leading-relaxed tracking-tight whitespace-pre-wrap text-[15px] px-4">
            {data.biography}
          </div>
        )}
      </div>
    );
}

function ListLayout({ data }: { data: List }) {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="w-48 aspect-square mb-8 relative">
          <img src={data.cover_url} className="w-full h-full object-cover rounded-3xl border border-gray-50" alt={data.title || "list"} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2">{data.title}</h2>
        <p className="text-gray-400 text-sm">Created by {data.profiles?.username}</p>
      </div>
    );
}
