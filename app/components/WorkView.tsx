'use client';

import React from 'react';
import Link from 'next/link';
import { Work, Credit, Track } from '../types';

interface WorkViewProps {
  data: Work;
}

export default function WorkView({ data }: WorkViewProps) {
  switch (data.work_type?.toLowerCase()) {
    case 'movie':
    case 'tv':
      return <MovieLayout data={data} />;
    case 'album':
      return <AlbumLayout data={data} />;
    case 'track':
      return <TrackLayout data={data} />;
    case 'book':
      return <BookLayout data={data} />;
    default:
      return <DefaultLayout data={data} />;
  }
}

function MovieLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Poster */}
      <div className="flex justify-center pt-8 pb-6 px-6">
        <div className="w-[190px] aspect-[2/3] relative overflow-hidden border border-gray-100">
          <img
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
          />
        </div>
      </div>

      {/* Main Info */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-[26px] font-black text-black leading-[1.2] tracking-tighter">
            {data.work_title}
          </h1>
          {data.rating_count && data.rating_count > 0 ? (
            <div className="flex items-center text-[18px] font-bold text-black mt-1">
              <img src="/icons/star_icon.png" className="w-[16px] h-[16px] mr-1" alt="star" />
              <span>{data.rating_avg?.toFixed(1)}</span>
              <span className="text-gray-300 ml-1">({data.rating_count})</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-0 mt-2">
          <p className="text-[12px] text-gray-400 font-medium tracking-tight">
            {getCategoryLabel(data.work_type)} · {data.artist_name}, {data.work_year}
          </p>
          <p className="text-[12px] text-gray-400 font-medium tracking-tight leading-none">
            {data.production_countries?.join(', ') || '한국'} · {data.genres?.join(', ')} · {formatRuntime(data.runtime_minutes)}
          </p>
        </div>
      </div>

      {/* Overview */}
      {data.biography && (
        <div className="px-5 mb-8">
          <p className="text-[15px] text-[#222] leading-normal whitespace-pre-wrap tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      {/* Credits */}
      {data.credits && data.credits.length > 0 && (
        <div className="px-5 mb-12">
          <h3 className="text-[18px] font-bold text-black mb-4">크레딧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
            {data.credits.map((credit) => (
              <div key={credit.id} className="flex items-center gap-2">
                <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <img
                    src={credit.profile_path ? `https://image.tmdb.org/t/p/w200${credit.profile_path}` : "/icons/default_profile.jpg"}
                    className="w-full h-full object-cover"
                    alt={credit.name}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-black truncate">{credit.name}</span>
                  <span className="text-[12px] text-gray-400 truncate">{getRoleLabel(credit.role)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Cover */}
      <div className="flex justify-center pt-8 pb-6 px-6">
        <div
          className="aspect-square relative overflow-hidden border border-gray-100"
          style={{ width: '260px', height: '260px' }}
        >
          <img
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
          />
        </div>
      </div>

      {/* Main Info */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-[26px] font-black text-black leading-[1.2] tracking-tight">
            {data.work_title}
          </h1>
        </div>
        <div className="flex flex-col">
          <p className="text-[12px] text-gray-400 font-medium tracking-tight leading-none mb-1">
            앨범 · {data.display_artist_name || data.artist_name} · {data.work_year}
          </p>
          <p className="text-[12px] text-gray-400 font-medium tracking-tight leading-none">
            {data.genres?.join(', ')}
          </p>
        </div>
      </div>

      {/* Biography */}
      {data.biography && (
        <div className="px-5 mb-8">
          <p className="text-[14px] text-[#222] leading-normal whitespace-pre-wrap tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      {/* Tracks */}
      {data.tracks_cache && data.tracks_cache.length > 0 && (
        <div className="px-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-normal text-black">트랙 리스트</h3>
          </div>
          <div className="flex flex-col">
            {data.tracks_cache.map((track) => (
              <Link 
                key={track.id} 
                href={`/work/${track.id.includes(':') ? track.id.split(':').pop() : track.id}`}
                className="flex items-start py-2 gap-2"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-[14px] font-normal text-black w-6 text-left">{track.track_number}.</span>
                  <div className="flex flex-col flex-1 pl-1 min-w-0">
                    <span className="text-[14px] font-normal text-black line-clamp-1 tracking-tighter">{track.name}</span>
                    <span className="text-[11px] text-gray-400 truncate tracking-tighter">
                      {track.artists.map(a => a.name).join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 pt-[2px]">
                  {track.duration_ms && (
                    <span className="text-[11px] text-gray-300">{formatDuration(track.duration_ms)}</span>
                  )}
                  <img
                    src="/icons/backIcon_right.png"
                    className="w-[10px] h-[10px] object-contain"
                    alt="arrow"
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Credits for Music */}
      {data.credits && data.credits.length > 0 && (
        <div className="px-5 mb-12">
          <h3 className="text-[18px] font-bold text-black mb-4">크레딧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
            {data.credits.map((credit) => (
              <div key={credit.id} className="flex items-center gap-2">
                <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <img
                    src={credit.profile_path ? (credit.profile_path.startsWith('http') ? credit.profile_path : `https://image.tmdb.org/t/p/w200${credit.profile_path}`) : "/icons/default_profile.jpg"}
                    className="w-full h-full object-cover"
                    alt={credit.name}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-black truncate">{credit.name}</span>
                  <span className="text-[12px] text-gray-400 truncate">{getRoleLabel(credit.role)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrackLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Cover */}
      <div className="flex justify-center pt-8 pb-6 px-6">
        <div
          className="aspect-square relative overflow-hidden border border-gray-100"
          style={{ width: '260px', height: '260px' }}
        >
          <img
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
          />
        </div>
      </div>

      {/* Main Info */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-[26px] font-black text-black leading-[1.2] tracking-tight">
            {data.work_title}
          </h1>
        </div>
        <div className="flex flex-col">
          <p className="text-[12px] text-gray-400 font-medium tracking-tight leading-none">
            곡 · {data.display_artist_name || data.artist_name} · {data.work_year}
          </p>
        </div>
      </div>

      {/* Biography */}
      {data.biography && (
        <div className="px-5 mb-8">
          <p className="text-[14px] text-[#222] leading-normal whitespace-pre-wrap tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      {/* Album Info */}
      {data.parent_album_cache && (
        <div className="px-5 mb-8">
          <Link 
            href={`/work/${data.parent_album_cache.id}`}
            className="flex items-center transition-colors"
          >
            <div className="w-[64px] h-[64px] overflow-hidden flex-shrink-0">
              <img src={data.parent_album_cache.poster_path} className="w-full h-full object-cover" alt="album cover" />
            </div>
            <div className="flex flex-col pl-4 min-w-0">
              <span className="text-[15px] font-normal text-black truncate tracking-tight">{data.parent_album_cache.title}</span>
              <span className="text-[12px] text-gray-500 truncate tracking-tight">{data.parent_album_cache.artist_names_display}</span>
            </div>
          </Link>
        </div>
      )}

      {/* Credits */}
      {data.credits && data.credits.length > 0 && (
        <div className="px-5 mb-12">
          <h3 className="text-[18px] font-bold text-black mb-4">크레딧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
            {data.credits.map((credit) => (
              <div key={credit.id} className="flex items-center gap-2">
                <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <img
                    src={credit.profile_path ? (credit.profile_path.startsWith('http') ? credit.profile_path : `https://image.tmdb.org/t/p/w200${credit.profile_path}`) : "/icons/default_profile.jpg"}
                    className="w-full h-full object-cover"
                    alt={credit.name}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-black truncate">{credit.name}</span>
                  <span className="text-[12px] text-gray-400 truncate">{getRoleLabel(credit.role)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BookLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Cover */}
      <div className="flex justify-center pt-8 pb-6 px-5">
        <div className="w-[170px] aspect-[10/16] relative overflow-hidden bg-white border border-gray-100/50">
          <img
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
          />
        </div>
      </div>

      {/* Main Info */}
      <div className="px-5 mb-4">
        <h1 className="text-[26px] font-black text-black leading-[1.2] mb-2 tracking-tighter">
          {data.work_title}
        </h1>
        <p className="text-[12px] text-gray-400 font-medium tracking-tight">
          {getCategoryLabel(data.work_type)} · {data.artist_name}, {data.work_year}
        </p>
      </div>

      {/* Biography / Description */}
      {data.biography && (
        <div className="px-5 mb-8">
          <p className="text-[15px] text-[#222] leading-normal whitespace-pre-wrap font-normal tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}
    </div>
  );
}

function DefaultLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col items-center py-10 px-5">
      <div className="w-48 aspect-square relative rounded-[16px] overflow-hidden mb-8 border border-gray-100">
        <img src={data.image_url} className="w-full h-full object-cover" alt={data.work_title} />
      </div>
      <h1 className="text-2xl font-bold mb-1 text-center">{data.work_title}</h1>
      <p className="text-gray-500 mb-8">{data.artist_name}</p>
    </div>
  );
}

// Helpers
function getCategoryLabel(type: string) {
  switch (type) {
    case 'movie': return '영화';
    case 'tv': return 'TV 프로그램';
    case 'album': return '앨범';
    case 'track': return '곡';
    case 'book': return '책';
    default: return '작품';
  }
}

function getRoleLabel(role: string, characterName?: string) {
  const roleLower = role.toLowerCase();
  const roleClean = roleLower.replace(/_/g, ' ');

  if (roleClean.includes('director') || roleClean === 'directing') return '감독';
  if (roleClean.includes('writing') || roleClean.includes('screenplay') || roleClean === 'writer' || roleClean === 'screenwriting') return '각본';
  if (roleClean.includes('actor') || roleClean.includes('acting') || roleClean === 'cast') return '배우';
  if (roleClean.includes('cinematographer') || roleClean.includes('cinematography') || roleClean.includes('camera')) return '촬영 감독';
  if (roleClean.includes('music') || roleClean === 'original music composer' || roleClean === 'composer') return '음악 감독';
  if (roleClean.includes('editor') || roleClean === 'editing') return '편집자';
  if (roleClean.includes('production design') || roleClean.includes('art direction') || roleClean.includes('art director') || roleClean.includes('production designer')) return '미술 감독';
  if (roleClean.includes('costume')) return '의상 디자이너';
  if (roleClean.includes('sound')) return '사운드 디자이너';

  switch (roleLower) {
    case 'producer': return '제작';
    case 'album_artist': return '아티스트';
    case 'artist': return '아티스트';
    case 'author': return '작가';
    default: return role;
  }
}

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatRuntime(minutes: number | null | undefined) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}
