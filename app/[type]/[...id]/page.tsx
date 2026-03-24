import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import ProfileView from "../../components/ProfileView";
import WorkView from "../../components/WorkView";
import AppActionButton from "../../components/AppActionButton";
import Link from "next/link";
import { Work, Post, List, Profile, Artist, TASHData, Credit } from "../../types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchContent(type: string, id: string): Promise<{ data: TASHData | null; error: string | null }> {
  const decodedId = decodeURIComponent(id).normalize('NFC');
  const hex = Buffer.from(decodedId).toString('hex');
  console.log(`[fetchContent] type: ${type}, id: ${id}, decodedId: ${decodedId} (hex: ${hex})`);
  
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { data: null, error: "Config Missing" };
    if (type === "work") {
      console.log(`[fetchContent] Resolving work for ID: "${decodedId}"`);
      
      // 1. Try finding the work directly
      let directQuery = supabase.from("works").select("*");
      if (decodedId.includes(':')) {
        directQuery = directQuery.eq("id", decodedId);
      } else {
        directQuery = directQuery.or(`id.eq."${decodedId}",id.ilike."%:${decodedId}"`);
      }

      let { data: workData, error: workError } = await directQuery.maybeSingle();
      
      if (workData) {
        console.log(`[fetchContent] Found direct work match: ${workData.work_title} (${workData.id})`);
      }

      // 2. Fallback: Search in albums' tracks_cache
      if (!workData) {
        // Extract the potential Spotify ID (usually the last part of a TASH ID or the ID itself)
        const spotifyId = decodedId.includes(':') ? decodedId.split(':').pop() : decodedId;
        
        console.log(`[fetchContent] Direct match failed. Searching fallback for Spotify ID: "${spotifyId}"`);
        
        // Search across all works that have tracks_cache containing this ID
        // Note: We use .contains on the jsonb column
        const { data: albumsWithTrack, error: fallbackError } = await supabase
          .from("works")
          .select("*")
          .contains('tracks_cache', [{ id: spotifyId }])
          .limit(10); // Find a few in case of duplicates

        if (fallbackError) {
          console.error(`[fetchContent] Fallback query error:`, fallbackError);
        }

        if (albumsWithTrack && albumsWithTrack.length > 0) {
          console.log(`[fetchContent] Found ${albumsWithTrack.length} potential albums in fallback.`);
          
          for (const album of albumsWithTrack) {
            const track = album.tracks_cache?.find((t: any) => t.id === spotifyId);
            if (track) {
              console.log(`[fetchContent] Success! Resolved track "${track.name}" via album "${album.work_title}".`);
              workData = {
                id: track.id,
                work_title: track.name,
                work_type: 'track',
                image_url: album.image_url,
                artist_name: track.artists?.map((a: any) => a.name).join(', ') || album.artist_name,
                work_year: album.work_year,
                genres: album.genres,
                biography: album.biography, // Optional fallback
                parent_album_cache: {
                  id: album.id,
                  title: album.work_title,
                  poster_path: album.image_url,
                  artist_names_display: album.artist_name || album.display_artist_name
                },
                rating_avg: 0,
                rating_count: 0,
                credits: []
              } as any;
              break;
            }
          }
        } else {
          console.log(`[fetchContent] Fallback search returned no albums.`);
        }
      }

      if (!workData) {
        console.error(`[fetchContent] ALL resolution failed for ID: "${decodedId}"`);
        return { data: null, error: "Not Found" };
      }
      if (workError) {
        console.error(`[fetchContent] workError for ${decodedId}:`, workError);
        return { data: null, error: workError.message };
      }

      // Fetch Ratings and Count
      const { data: postsData } = await supabase
        .from("posts")
        .select("rating")
        .eq("work_id", workData.id)
        .not("rating", "is", null);

      let rating_avg = 0;
      let rating_count = 0;
      if (postsData && postsData.length > 0) {
        rating_count = postsData.length;
        const total = postsData.reduce((acc, p) => acc + (p.rating || 0), 0);
        rating_avg = total / rating_count;
      }

      // Fetch Credits
      const { data: creditsData } = await supabase
        .from("work_artist")
        .select(`
          role,
          character_name,
          artist_order,
          artists (
            id,
            name,
            profile_path
          )
        `)
        .eq("work_id", workData.id)
        .order("artist_order", { ascending: true })
        .limit(20);

      const credits: Credit[] = (creditsData || []).map((c: any) => ({
        id: c.artists.id,
        name: c.artists.name,
        profile_path: c.artists.profile_path,
        role: c.role,
        character_name: c.character_name
      }));

      return {
        data: {
          ...workData,
          rating_avg,
          rating_count,
          credits
        } as Work,
        error: null
      };
    } else if (type === "post") {
      const { data, error } = await supabase.from("posts").select("*, profiles(*), works(*)").eq("id", decodedId).single();
      return { data, error: error?.message || null };
    } else if (type === "profile") {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);
      
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
      const listsPromise = supabase.rpc("get_user_lists", { p_user_id: profileRes.data.id, p_limit: 6, p_offset: 0 });
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
          followers_count: results[0].count || 0,
          following_count: results[1].count || 0,
          works_count: results[2].count || 0,
          initial_posts: postsRes.data || [],
          initial_lists: listsRes.data || [],
          initial_archives: archivesRes.data || []
        },
        error: null
      };
    } else if (type === "artist") {
      const { data, error } = await supabase.from("artists").select("*").eq("id", decodedId).single();
      return { data, error: error?.message || null };
    } else if (type === "list") {
      const { data, error } = await supabase.from("lists").select("*, profiles(*)").eq("id", decodedId).single();
      return { data, error: error?.message || null };
    } else {
      return { data: null, error: `Invalid Type: ${type}` };
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { data: null, error: errorMessage };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ type: string; id: string | string[] }> }): Promise<Metadata> {
  const { type, id } = await params;
  const resolvedId = Array.isArray(id) ? id.join('/') : id;
  const { data } = await fetchContent(type, resolvedId);

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

export default async function SharePage({ params }: { params: Promise<{ type: string; id: string | string[] }> }) {
  const resolvedParams = await params;
  const { type, id } = resolvedParams;
  const resolvedId = Array.isArray(id) ? id.join('/') : id;
  const { data } = await fetchContent(type, resolvedId);

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
        <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md flex items-center px-6 z-50">
          <img src="/icons/app_logo.png" className="h-6 object-contain" alt="TASH" />
        </header>
      )}

      <main className={`${type === 'profile' ? 'pt-0' : 'pt-14'} px-0 max-w-2xl mx-auto`}>
        {type === 'work' && <WorkView data={data as Work} />}
        {type === 'post' && <PostLayout data={data as Post} />}
        {type === 'profile' && <ProfileView data={data as Profile} />}
        {type === 'artist' && <ArtistLayout data={data as Artist} />}
        {type === 'list' && <ListLayout data={data as List} />}
      </main>

      {type !== 'profile' && <AppActionButton type={type} id={resolvedId} />}
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

      <div className="bg-[#F8F9FA] p-4 flex items-center mb-6 border border-gray-100/50 mx-4">
        <img src={data.works?.image_url} className="w-14 h-20 object-cover mr-4 border border-gray-200/30" alt="work" />
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
          <img src={data.cover_url} className="w-full h-full object-cover border border-gray-50" alt={data.title || "list"} />
        </div>
        <h2 className="text-2xl font-extrabold mb-2">{data.title}</h2>
        <p className="text-gray-400 text-sm">Created by {data.profiles?.username}</p>
      </div>
    );
}
