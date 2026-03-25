import { createClient } from "@supabase/supabase-js";
import { Metadata } from "next";
import ProfileView from "../../components/ProfileView";
import WorkView from "../../components/WorkView";
import ArtistView from "../../components/ArtistView";
import AppActionButton from "../../components/AppActionButton";
import Link from "next/link";
import { Work, Post, List, Profile, Artist, TASHData, Credit } from "../../types";


export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function enrichWorkData(workData: any): Promise<Work> {
  // Fetch Ratings and Credits in parallel
  const [postsRes, waRes] = await Promise.all([
    supabase
      .from("posts")
      .select("rating")
      .eq("work_id", workData.id)
      .not("rating", "is", null),
    supabase
      .from("work_artist")
      .select("role, character_name, artist_id, artist_order")
      .eq("work_id", workData.id)
      .order("artist_order", { ascending: true })
      .limit(20)
  ]);

  const postsData = postsRes.data;
  const waData = waRes.data;

  let rating_avg = 0;
  let rating_count = 0;
  if (postsData && postsData.length > 0) {
    rating_count = postsData.length;
    const total = postsData.reduce((acc: any, p: any) => acc + (p.rating || 0), 0);
    rating_avg = total / rating_count;
  }

  const credits: Credit[] = [];
  if (waData && waData.length > 0) {
    const artistIds = Array.from(new Set(waData.map((wa: any) => wa.artist_id).filter(Boolean)));
    const { data: aData } = await supabase
      .from("artists")
      .select("id, name, profile_path")
      .in("id", artistIds);

    // Map them together
    waData.forEach((wa: any) => {
      // Precise or Suffix match for artist ID
      const artist = aData?.find((a: any) => 
        a.id === wa.artist_id || 
        (a.id.includes(':') && wa.artist_id.includes(':') && a.id.split(':').pop() === wa.artist_id.split(':').pop())
      );
      
      const name = artist?.name || '';
      // Only add if name exists, or use a fallback if absolutely necessary
      if (name) {
        credits.push({
          id: artist?.id || wa.artist_id || `fallback:${name}`,
          name: name,
          profile_path: artist?.profile_path || null,
          role: wa.role || '',
          character_name: wa.character_name || ''
        });
      }
    });
  }

  return {
    ...workData,
    rating_avg,
    rating_count,
    credits
  };
}

async function fetchFallbackMetadata(type: string, id: string): Promise<Work | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const functionName = "ensure-work-exists";
    const TASH_INTERNAL_SECRET = 'tash_sync_secret_2026_redacted';
    const body = { work_id: id, work_type: type };
    
    if (!functionName) return null;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = serviceRoleKey ? `Bearer ${serviceRoleKey}` : `Bearer ${supabaseAnonKey}`;

    console.log(`[fetchFallbackMetadata] Triggering fallback for ${type}/${id} via ${functionName}`);
    
    // Add a 12 second timeout to prevent hanging the whole request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'x-tash-internal-key': TASH_INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);


    if (!response.ok) {
      console.warn(`[fetchFallbackMetadata] Fallback failed with status: ${response.status}`);
      return null;
    }

    const result = await response.json();
    const resolvedData = result.data || result; 

    let workData: any = null;
    let creditsArray: any[] = [];
    let tracksArray: any[] = [];

    if (Array.isArray(resolvedData)) {
      // handle search results
      workData = resolvedData.find((v: any) => v.id === id) || resolvedData[0];
      creditsArray = workData?.credits || [];
    } else if (resolvedData.work) {
      // handle ensure-work-exists output format
      workData = resolvedData.work;
      creditsArray = resolvedData.credits || [];
      tracksArray = resolvedData.tracks || [];
    }

    if (!workData) return null;

    // [BFF 통합] 트랙의 부모 앨범 필드 매핑 보강
    // ensure-work-exists는 'title', 'poster_path'를 사용함
    if (workData.parent_album && !workData.parent_album_cache) {
      workData.parent_album_cache = {
        id: workData.parent_album.id,
        title: workData.parent_album.title || workData.parent_album.work_title,
        poster_path: workData.parent_album.poster_path || workData.parent_album.image_url,
        artist_names_display: workData.parent_album.artist_names_display || workData.parent_album.artist_name || workData.parent_album.display_artist_name
      };
    }

    // Flatten and normalize credits
    const finalCredits: any[] = [];
    
    // 1. Add credits from the main credits array (supports various formats)
    if (Array.isArray(creditsArray)) {
      finalCredits.push(...creditsArray.map(c => {
        // Paranoid name check: all possible variations from Edge Function and DB Joins
        const name = (c.name || c.artist_name || c.person_name || c.credit_name || c.display_name || c.person?.name || c.artist?.name || '').trim();
        const id = c.id || c.artist_id || c.credit_id || (name ? `fallback:${name}` : Math.random().toString());
        return {
          id,
          name,
          role: c.role || c.job || (type === 'book' ? '작가' : '출연'),
          profile_path: c.profile_path || c.image_url || (c.person?.profile_path ? `https://image.tmdb.org/t/p/w200${c.person.profile_path}` : null)
        };
      }).filter(c => c.name)); // Filter out items with no name
    }

    // 2. Add credits from workData.credits object (legacy/nested TMDB style)
    if (workData.credits && !Array.isArray(workData.credits)) {
      const c = workData.credits;
      if (c && typeof c === 'object') {
        const extract = (arr: any[], defaultRole: string) => {
          if (Array.isArray(arr)) {
            finalCredits.push(...arr.map(p => {
              const name = (p.name || p.artist_name || p.person?.name || '').trim();
              const id = p.id || p.artist_id || p.credit_id || (name ? `fallback:${name}` : Math.random().toString());
              return {
                id,
                name,
                role: p.role || p.job || defaultRole,
                profile_path: p.profile_path || p.image_url || (p.profile_path ? `https://image.tmdb.org/t/p/w200${p.profile_path}` : null)
              };
            }).filter(p => p.name));
          }
        };
        extract(c.director, 'director');
        extract(c.cast, 'cast');
        extract(c.writer, 'writer');
        extract(c.artist, 'artist');
      }
    }

    // 3. Fallback for books if author is missing from credits
    if (type === "book" && (workData.author || workData.artist_name)) {
      const authorName = (workData.author || workData.artist_name).replace(/,\s*$/, '').trim();
      if (authorName && !finalCredits.some(c => c.name?.trim().toLowerCase() === authorName.toLowerCase())) {
        finalCredits.push({
          id: `author:${authorName}`,
          name: authorName,
          role: '작가',
          profile_path: null
        });
      }
    }

    // De-duplicate credits: Priority to ones with names/profiles
    // Use a composite key of Name + Role for safest de-duplication when IDs vary
    const uniqueCreditsMap = new Map();
    finalCredits.forEach(c => {
      if (!c.name) return; // redundant safety
      const key = `${(c.role || '').toLowerCase()}:${(c.name || '').toLowerCase()}`;
      const existing = uniqueCreditsMap.get(key);
      
      // Keep if new, or if current has image and old doesn't
      if (!existing || (!existing.profile_path && c.profile_path)) {
        uniqueCreditsMap.set(key, c);
      }
    });
    const uniqueCredits = Array.from(uniqueCreditsMap.values());

    // Robust year extraction
    let extractedYear: number | null = null;
    const dateStr = workData.release_date || workData.pubdate || workData.year || '';
    if (dateStr) {
      const yearMatch = dateStr.toString().match(/\d{4}/);
      if (yearMatch) extractedYear = parseInt(yearMatch[0]);
    }

    return {
      id: workData.id || id,
      work_title: workData.work_title || workData.title || workData.name || '',
      work_type: workData.work_type || type,
      image_url: workData.image_url || workData.poster_path || workData.image || '',
      artist_name: (workData.artist_name || workData.artist_names_display || workData.author || '').replace(/,\s*$/, '').trim(),
      release_date: dateStr,
      description: workData.description || workData.overview || '',
      work_year: workData.work_year || extractedYear,
      genres: workData.genres || [],
      biography: workData.biography || workData.overview || '',
      rating_avg: workData.rating_avg || 0,
      rating_count: workData.rating_count || 0,
      credits: uniqueCredits,
      parent_album_cache: workData.parent_album || workData.parent_album_cache,
      tracks_cache: tracksArray.length > 0 ? tracksArray : (workData.tracks_cache || [])
    } as Work;
  } catch (err) {
    console.error(`[fetchFallbackMetadata] Error during fallback:`, err);
    return null;
  }
}

async function fetchArtistFallback(id: string): Promise<Artist | null> {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = serviceRoleKey ? `Bearer ${serviceRoleKey}` : `Bearer ${SUPABASE_ANON_KEY}`;
    const TASH_INTERNAL_SECRET = 'tash_sync_secret_2026_redacted';

    // 1. Determine Source
    let artistData: any = null;
    const isSpotify = id.startsWith('artist:music:') || /^[a-zA-Z0-9]{22}$/.test(id);
    const isTmdb = id.startsWith('artist:video:') || /^\d+$/.test(id);

    if (isSpotify) {
      const spotifyId = id.includes(':') ? id.split(':').pop() : id;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/spotify-get-artist-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ artistId: spotifyId })
      });
      if (res.ok) {
        const json = await res.json();
        artistData = json.data || json;
      }
    } else if (isTmdb) {
      const tmdbId = id.includes(':') ? id.split(':').pop() : id;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tmdb-get-person-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ personId: tmdbId })
      });
      if (res.ok) {
        const json = await res.json();
        const d = json.data || json;
        artistData = {
          id: `artist:video:${tmdbId}`,
          name: d.name,
          profile_path: d.profile_path,
          biography: d.biography
        };
      }
    }

    if (!artistData) return null;

    // 2. Persist to DB via ensure-artist-exists
    await fetch(`${SUPABASE_URL}/functions/v1/ensure-artist-exists`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': authHeader,
        'x-tash-internal-key': TASH_INTERNAL_SECRET
      },
      body: JSON.stringify(artistData)
    });

    return artistData as Artist;
  } catch (err) {
    console.error(`[fetchArtistFallback] Error:`, err);
    return null;
  }
}

async function fetchContent(type: string, id: string): Promise<{ data: TASHData | null; error: string | null }> {
  const decodedId = decodeURIComponent(id).normalize('NFC');
  console.log(`[fetchContent] type: ${type}, id: ${id}, decodedId: ${decodedId}`);
  
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { data: null, error: "Config Missing" };
    
    // Support both 'work' and specific type prefixes
    const workTypes = ["work", "movie", "tv", "track", "album", "book"];
    
    if (workTypes.includes(type)) {
      console.log(`[fetchContent] Resolving ${type} for ID: "${decodedId}"`);
      
      // 0. Infer actual type from prefixed ID if generic 'work' type is used
      let effectiveType = type;
      if (type === 'work' && decodedId.includes(':')) {
        const idParts = decodedId.split(':');
        const firstPart = idParts[0];
        
        // If the first part is a known work type, use it
        if (workTypes.includes(firstPart) && firstPart !== 'work') {
          effectiveType = firstPart;
          console.log(`[fetchContent] Inferred type "${effectiveType}" from canonical ID prefix`);
        } else if (idParts.length >= 3 && workTypes.includes(idParts[1])) {
          // rare legacy case: work:type:id
          effectiveType = idParts[1];
        }
      }

      const suffixId = decodedId.includes(':') ? decodedId.split(':').pop() || "" : decodedId;
      
      // Determine if we need to check for track parent album
      const potentialTrack = type === 'track' || (type === 'work' && (decodedId.startsWith('track:') || !decodedId.includes(':')));

      // 1~4. Aggressive Parallelism: Fetch main work, possible track album, AND enrichment data all at once
      console.log(`[fetchContent] Starting aggressive parallel lookups for ${decodedId}`);
      const [exactMatchRes, suffixMatchRes, albumByTrackRes, postsRes, waRes] = await Promise.all([
        supabase.from("works").select("*").eq("id", decodedId).maybeSingle(),
        supabase.from("works").select("*").ilike("id", `%:${suffixId}`).limit(1),
        potentialTrack ? supabase.rpc('search_works_by_track_id', { search_id: suffixId }) : Promise.resolve({ data: null }),
        // Speculatively fetch ratings and credits for decodedId
        supabase.from("posts").select("rating").eq("work_id", decodedId).not("rating", "is", null),
        supabase.from("work_artist").select("role, character_name, artist_id, artist_order").eq("work_id", decodedId).order("artist_order", { ascending: true }).limit(20)
      ]);

      const exactMatch = exactMatchRes.data;
      const suffixMatch = suffixMatchRes.data && suffixMatchRes.data.length > 0 ? suffixMatchRes.data[0] : null;
      const albums = albumByTrackRes.data;
      
      let dbWork = exactMatch || suffixMatch;

      // Helper function to assemble enriched data from pre-fetched parallel results
      const assembleEnriched = async (work: any, prePosts: any, preWa: any) => {
        // If the work we found is different from the decodedId (e.g. suffix match), we might need fresh enrichment
        // but for exact matches, we already have it!
        if (work.id === decodedId) {
          const rating_count = prePosts?.length || 0;
          const rating_avg = rating_count > 0 ? prePosts.reduce((acc: any, p: any) => acc + (p.rating || 0), 0) / rating_count : 0;
          
          let credits: Credit[] = [];
          if (preWa && preWa.length > 0) {
            const artistIds = Array.from(new Set(preWa.map((wa: any) => wa.artist_id).filter(Boolean)));
            const { data: aData } = await supabase.from("artists").select("id, name, profile_path").in("id", artistIds);
            credits = preWa.map((wa: any) => {
              const artist = aData?.find(a => a.id === wa.artist_id);
              return { id: wa.artist_id, name: artist?.name || 'Unknown', profile_path: artist?.profile_path, role: wa.role, character_name: wa.character_name };
            });
          }
          return { ...work, rating_avg, rating_count, credits };
        }
        // Fallback for suffix/track matches that weren't the decodedId
        return await enrichWorkData(work);
      };

      // 3. Special handling for tracks (search in album caches)
      const looksLikeTrack = type === 'track' || 
                           dbWork?.work_type === 'track' || 
                           (type === 'work' && decodedId.startsWith('track:')) ||
                           (type === 'work' && !dbWork && !decodedId.includes(':'));
      
      if (looksLikeTrack) {
        console.log(`[fetchContent] Checking parent album for track: ${suffixId}`);

        const parentAlbum = albums && albums.length > 0 ? albums[0] : null;
        const trackInCache = parentAlbum?.tracks_cache?.find((t: any) => 
          t.id === suffixId || t.id?.endsWith(':' + suffixId)
        );

        if (trackInCache || dbWork?.work_type === 'track') {
          const resolvedId = trackInCache?.id || dbWork?.id || decodedId;
          
          const artistsFromCache = trackInCache?.artists || [];
          const trackCredits = (artistsFromCache || []).map((a: any, idx: number) => {
            const name = a.name || a.artist_name || '';
            return {
              id: a.id || (name ? `fallback:${name}` : `track-artist-${idx}`),
              name,
              profile_path: a.profile_path || null,
              role: 'artist',
              artist_order: idx
            };
          });

          if (trackCredits.length > 0) {
            const pureIds = trackCredits.map((c: any) => c.id);
            const prefixedIds = pureIds.map((pid: string) => `artist:music:${pid}`);
            const searchIds = [...new Set([...pureIds, ...prefixedIds])];
            
            const { data: dbArtists } = await supabase.from('artists').select('id, profile_path').in('id', searchIds);
            
            if (dbArtists) {
              trackCredits.forEach((c: any) => {
                const match = dbArtists.find(da => 
                  da.id === c.id || 
                  da.id === `artist:music:${c.id}` || 
                  da.id.endsWith(`:${c.id}`)
                );
                if (match && match.profile_path) {
                  c.profile_path = match.profile_path;
                }
              });
            }
          }

          const enriched = await assembleEnriched(parentAlbum, postsRes.data, waRes.data);
          
          return {
            data: {
              id: resolvedId,
              work_title: trackInCache?.name || dbWork?.work_title || decodedId,
              work_type: 'track',
              image_url: parentAlbum?.image_url || dbWork?.image_url,
              artist_name: artistsFromCache.map((a: any) => a.name).join(', ') || dbWork?.artist_name || parentAlbum?.artist_name,
              work_year: parentAlbum?.work_year || dbWork?.work_year,
              genres: parentAlbum?.genres || dbWork?.genres,
              parent_album_cache: parentAlbum ? {
                id: parentAlbum.id,
                title: parentAlbum.work_title || parentAlbum.title,
                poster_path: parentAlbum.image_url || parentAlbum.poster_path,
                artist_names_display: parentAlbum.artist_name || parentAlbum.display_artist_name || parentAlbum.artist_names_display
              } : dbWork?.parent_album_cache,
              rating_avg: enriched.rating_avg || 0,
              rating_count: enriched.rating_count || 0,
              credits: trackCredits.length > 0 ? trackCredits : enriched.credits,
              biography: null
            } as any,
            error: null
          };
        }
      }

      // 4. Return DB work if resolved
      if (dbWork) {
        console.log(`[fetchContent] Resolved to DB work: ${dbWork.id}`);
        const enriched = await assembleEnriched(dbWork, postsRes.data, waRes.data);
        
        // If credits are empty for non-book works, try API fallback as a last resort
        if ((!enriched.credits || enriched.credits.length === 0) && effectiveType !== 'book') {
          console.log(`[fetchContent] Credits empty for ${dbWork.id}, attempting API fallback...`);
        } else {
          return { data: enriched, error: null };
        }
      }

      // 5. Fallback: Resolve via Edge Functions for uncached works
      const fallbackData = await fetchFallbackMetadata(effectiveType, decodedId);
      if (fallbackData) {
        console.log(`[fetchContent] Resolved via Fallback API: ${decodedId}`);
        return { data: fallbackData, error: null };
      }

      const debugInfo = `Type: ${type}, EffectiveType: ${effectiveType}, DecodedId: ${decodedId}, SuffixId: ${suffixId}`;
      console.error(`[fetchContent] No DB or API match found for ${debugInfo}`);
      return { data: null, error: `Information Not Found (Debug: ${debugInfo})` };
      
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
      const suffixId = decodedId.includes(':') ? decodedId.split(':').pop() || "" : decodedId;
      console.log(`[fetchContent] Resolving artist for ID: "${decodedId}" (Suffix: ${suffixId})`);
      
      let { data, error } = await supabase
        .from("artists")
        .select("*")
        .or(`id.eq.${decodedId},id.ilike.%:${suffixId}`)
        .limit(1)
        .maybeSingle();

      // Fallback: If not in DB, sync from external APIs
      if (!data && !error) {
        console.log(`[fetchContent] Artist not found in DB, attempting fallback sync...`);
        data = await fetchArtistFallback(decodedId);
      }

      if (data) {
        // Fetch Artist's Works
        const { data: worksData } = await supabase
          .from("work_artist")
          .select(`
            works (
              id,
              work_title,
              work_type,
              work_year,
              image_url
            )
          `)
          .eq("artist_id", data.id)
          .order("artist_order", { ascending: true })
          .limit(12);

        const initial_works = (worksData || [])
          .map((w: any) => w.works)
          .filter((w: any) => w !== null);

        return { data: { ...data, initial_works }, error: null };
      }

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
    const workTypes = ["work", "movie", "tv", "track", "album", "book"];
    if (workTypes.includes(type)) {
      const work = data as Work;
      title = `${work.work_title} - ${work.artist_name}`;
      description = work.biography || `${work.artist_name}의 ${work.work_type === 'track' ? '곡' : '작품'} '${work.work_title}'`;
      image = work.image_url;
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
        {["work", "movie", "tv", "track", "album", "book"].includes(type) && <WorkView data={data as Work} />}
        {type === 'post' && <PostLayout data={data as Post} />}
        {type === 'profile' && <ProfileView data={data as Profile} />}
        {type === 'artist' && <ArtistView data={data as Artist} />}
        {type === 'list' && <ListLayout data={data as List} />}
      </main>

      {type !== 'profile' && <AppActionButton type={type} id={resolvedId} />}
    </div>
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
          <p className="text-[12px] text-gray-400 font-medium tracking-tight">
            {getCategoryLabel(data.works?.work_type)} · {data.works?.artist_name}{data.works?.work_year ? `, ${data.works.work_year}` : ''}
          </p>
        </div>
      </div>

      <div className="text-[17px] leading-relaxed whitespace-pre-wrap text-[#1A1A1A] px-5">
        {data.content}
      </div>
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
