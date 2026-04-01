'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Work, Credit, Track } from '../types';
import { resolveImageUrl, resolveProfileImageUrl } from '../utils/imageUtils';

/**
 * 작품 상세 보기 컴포넌트
 * 영화, TV, 앨범, 곡, 책 등 각 미디어 타입에 맞는 레이아웃을 렌더링합니다.
 */
interface WorkViewProps {
  data: Work;
}

export default function WorkView({ data }: WorkViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // 영화/TV 등은 6구 큐레이션 로직을 적용합니다. 
  // 펼쳐진 상태거나 6명 미만이면 전체 통합 리스트를 보여줍니다.
  const curatedCredits = (data.work_type === 'movie' || data.work_type === 'tv')
    ? getCuratedCredits(data.credits || [], isExpanded ? 0 : 6)
    : data.credits || [];

  switch (data.work_type?.toLowerCase()) {
    case 'movie':
    case 'tv':
      return <MovieLayout data={data} curatedCredits={curatedCredits} isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} />;
    case 'album':
      return <AlbumLayout data={data} curatedCredits={curatedCredits} />;
    case 'track':
      return <TrackLayout data={data} curatedCredits={curatedCredits} />;
    case 'book':
      return <BookLayout data={data} curatedCredits={curatedCredits} />;
    default:
      return <DefaultLayout data={data} />;
  }
}

function MovieLayout({
  data,
  curatedCredits,
  isExpanded,
  onToggle
}: {
  data: Work;
  curatedCredits: Credit[];
  isExpanded: boolean;
  onToggle: () => void
}) {
  const hasMore = (data.credits?.length || 0) > curatedCredits.length || isExpanded;

  return (
    <div className="flex flex-col bg-white">
      {/* 1. 포스터 영역 */}
      <div className="flex justify-center pt-8 pb-6 px-6 sm:pt-16">
        <div className="w-[190px] sm:w-[240px] aspect-[2/3] relative overflow-hidden border border-gray-100">
          <img
            src={resolveImageUrl(data.image_url)}
            className="w-full h-full object-cover"
            alt={data.work_title}
          />
        </div>
      </div>

      {/* 2. 메인 정보 (제목, 별점, 요약) */}
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
          <p className="text-[12px] text-gray-400 font-normal tracking-tight">
            {getCategoryLabel(data.work_type)} · {data.artist_name}{data.work_year ? `, ${data.work_year}` : ''}
          </p>
          <p className="text-[12px] text-gray-400 font-normal tracking-tight leading-none">
            {data.production_countries && data.production_countries.length > 0
              ? data.production_countries.map(c => getCountryName(c)).join(', ')
              : ''}
            {data.production_countries?.length && data.genres?.length ? ' · ' : ''}
            {data.genres?.join(', ')}
            {data.genres?.length && (data.runtime_minutes || (data.work_type === 'tv' && data.total_episodes)) ? ' · ' : ''}
            {data.work_type === 'tv' && data.total_episodes ? `총 ${data.total_episodes}화` : formatRuntime(data.runtime_minutes)}
          </p>
        </div>
      </div>

      {/* 3. 줄거리 (Overview) */}
      {data.biography && (
        <div className="px-5 mb-8">
          <p className="text-[15px] text-[#222] leading-normal whitespace-pre-wrap tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      {/* 4. 크레딧 (배우, 감독 등 인물 정보) → 필터링된 6인 또는 전체 노출 */}
      {curatedCredits.length > 0 && (
        <div className="px-5 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[18px] font-bold text-black">크레딧</h3>
            {hasMore && (
              <button
                onClick={onToggle}
                className="text-[14px] text-gray-400 font-normal hover:text-black transition-colors"
              >
                {isExpanded ? '접기' : '모두 보기'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
            {curatedCredits.map((credit, idx) => (
              <Link
                key={credit.id || `credit-${idx}`}
                href={`/artist/${credit.slug || credit.id}`}
                className="link-trigger flex items-center gap-2 group cursor-pointer"
              >
                {/* 인물 프로필 이미지 */}
                <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <img
                    src={resolveProfileImageUrl(credit.profile_path)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={credit.name}
                  />
                </div>
                {/* 이름 및 역할 설명 */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-black truncate font-normal group-hover:underline">{credit.name}</span>
                  <span className="text-[12px] text-gray-400 truncate">{credit.role}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumLayout({ data, curatedCredits }: { data: Work; curatedCredits: Credit[] }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Cover */}
      <div className="flex justify-center pt-8 pb-6 px-6">
        <div
          className="aspect-square relative overflow-hidden border border-gray-100 mx-auto"
          style={{ width: '260px', height: '260px' }}
        >
          <img
            src={resolveImageUrl(data.image_url)}
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
          <p className="text-[12px] text-gray-400 font-normal tracking-tight leading-none mb-1">
            앨범 · {data.display_artist_name || data.artist_name}{data.work_year ? ` · ${data.work_year}` : ''}
          </p>
          <p className="text-[12px] text-gray-400 font-normal tracking-tight leading-none">
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

      {/* Tracks → 앱 유도 링크 */}
      {data.tracks_cache && data.tracks_cache.length > 0 && (
        <div className="px-5 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-normal text-black">트랙 리스트</h3>
          </div>
          <div className="flex flex-col">
            {(data.tracks_cache || []).map((track) => (
              <div
                key={track.id}
                className="link-trigger flex items-start py-2 gap-2 cursor-pointer"
              >
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-[14px] font-normal text-black w-6 text-left">{track.track_number}.</span>
                  <div className="flex flex-col flex-1 pl-1 min-w-0">
                    <span className="text-[14px] font-normal text-black line-clamp-1 tracking-tighter">{track.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 pt-[2px]">
                  <img
                    src="/icons/backIcon_right.png"
                    className="w-[10px] h-[10px] object-contain"
                    alt="arrow"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 크레딧 (아티스트 정보) */}
      {curatedCredits.length > 0 && (
        <div className="px-5 mb-12">
          <h3 className="text-[18px] font-bold text-black mb-4">크레딧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
            {curatedCredits.map((credit, idx) => (
              <Link
                key={credit.id || `credit-${idx}`}
                href={`/artist/${credit.slug || credit.id}`}
                className="link-trigger flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <img
                    src={resolveProfileImageUrl(credit.profile_path)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={credit.name}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-black truncate font-normal group-hover:underline">{credit.name}</span>
                  <span className="text-[12px] text-gray-400 truncate">{getRoleLabel(credit.role)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrackLayout({ data, curatedCredits }: { data: Work; curatedCredits: Credit[] }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Cover */}
      <div className="flex justify-center pt-8 pb-6 px-6">
        <div
          className="aspect-square relative overflow-hidden border border-gray-100"
          style={{ width: '260px', height: '260px' }}
        >
          <img
            src={resolveImageUrl(data.image_url)}
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
          <p className="text-[12px] text-gray-400 font-normal tracking-tight leading-none">
            곡 · {data.display_artist_name || data.artist_name}{data.work_year ? ` · ${data.work_year}` : ''}
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

      {/* Album Info → 앱 유도 링크 */}
      {data.parent_album_cache && (
        <div className="px-5 mb-8">
          <Link
            href={`/album/${data.parent_album_cache.slug || data.parent_album_cache.id}`}
            className="link-trigger flex items-center transition-colors cursor-pointer"
          >
            <div className="w-[64px] h-[64px] overflow-hidden flex-shrink-0">
              <img src={resolveImageUrl(data.parent_album_cache.poster_path)} className="w-full h-full object-cover" alt="album cover" />
            </div>
            <div className="flex flex-col pl-4 min-w-0">
              <span className="text-[15px] font-normal text-black truncate tracking-tight">{data.parent_album_cache.title}</span>
              <span className="text-[12px] text-gray-500 truncate tracking-tight">{data.parent_album_cache.artist_names_display}</span>
            </div>
          </Link>
        </div>
      )}

      {/* 3. 크레딧 (참여한 아티스트 정보) */}
      {curatedCredits.length > 0 && (
        <div className="px-5 mb-12">
          <h3 className="text-[18px] font-bold text-black mb-4">크레딧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
            {curatedCredits.map((credit, idx) => (
              <div
                key={credit.id || `credit-${idx}`}
                className="link-trigger flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <img
                    src={resolveProfileImageUrl(credit.profile_path)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={credit.name}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-black truncate font-normal group-hover:underline">{credit.name}</span>
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

function BookLayout({ data, curatedCredits }: { data: Work; curatedCredits: Credit[] }) {
  return (
    <div className="flex flex-col bg-white">
      {/* Cover */}
      <div className="flex justify-center pt-8 pb-6 px-5">
        <div className="w-[170px] aspect-[10/16] relative overflow-hidden bg-white border border-gray-100/50">
          <img
            src={resolveImageUrl(data.image_url)}
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
        <p className="text-[12px] text-gray-400 font-normal tracking-tight">
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

      {/* 3. 크레딧 (저자 및 관련 인물 정보) */}
      {curatedCredits.length > 0 && (
        <div className="px-5 mb-12">
          <h3 className="text-[18px] font-bold text-black mb-4">크레딧</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
            {curatedCredits.map((credit, idx) => (
              <div
                key={credit.id || `credit-${idx}`}
                className="link-trigger flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                  <img
                    src={resolveProfileImageUrl(credit.profile_path)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={credit.name}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] text-black truncate font-normal group-hover:underline">{credit.name}</span>
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

function DefaultLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col items-center py-10 px-5">
      <div className="w-48 aspect-square relative rounded-[16px] overflow-hidden mb-8 border border-gray-100">
        <img src={resolveImageUrl(data.image_url)} className="w-full h-full object-cover" alt={data.work_title} />
      </div>
      <h1 className="text-2xl font-bold mb-1 text-center">{data.work_title}</h1>
      <p className="text-gray-500 mb-8">{data.artist_name}</p>
    </div>
  );
}

// === New Utilities for Curated Credits ===

/**
 * 영화/TV용 6구 큐레이션 알고리즘
 * 우선순위에 따라 최대 6명의 크레딧을 선정하거나 전체를 반환하며, 6구 모드에서는 빈자리는 후순위 스태프로 채웁니다.
 */
function getCuratedCredits(credits: Credit[], limit: number = 0): Credit[] {
  if (!credits || credits.length === 0) return [];

  const artistMap = new Map<string, { credit: Credit; roles: Set<string> }>();

  // 1. 인물별 역할 통합
  credits.forEach(c => {
    if (!artistMap.has(c.id)) {
      artistMap.set(c.id, { credit: { ...c }, roles: new Set() });
    }
    artistMap.get(c.id)!.roles.add(c.role.toLowerCase());
  });

  const uniqueArtists = Array.from(artistMap.values());

  // 전체 모드 (limit === 0) 인 경우 역할 통합 상태로 전체 반환
  if (limit === 0) {
    return uniqueArtists.map(a => ({
      ...a.credit,
      role: getMergedRoleLabel(a.roles)
    }));
  }

  const selectedArtists: typeof uniqueArtists[0][] = [];
  const selectedIds = new Set<string>();

  const hasRole = (roles: Set<string>, ...targets: string[]) =>
    Array.from(roles).some(r => targets.some(t => r.includes(t)));

  const addToSelection = (candidates: typeof uniqueArtists) => {
    for (const a of candidates) {
      if (selectedArtists.length >= limit) break;
      if (!selectedIds.has(a.credit.id)) {
        selectedArtists.push(a);
        selectedIds.add(a.credit.id);
      }
    }
  };

  // 2. 우선순위 패킹
  // P1: 감독 / 각본 (최대 2명)
  addToSelection(uniqueArtists
    .filter(a => hasRole(a.roles, 'director', 'writing', 'screenplay', 'writer'))
    .slice(0, 2));

  // P2: 배우 (최대 2명)
  if (selectedArtists.length < limit) {
    addToSelection(uniqueArtists
      .filter(a => hasRole(a.roles, 'cast', 'actor'))
      .slice(0, 2));
  }

  // P3: 촬영 감독 (1명)
  if (selectedArtists.length < limit) {
    addToSelection(uniqueArtists
      .filter(a => hasRole(a.roles, 'cinematography', 'camera', 'photograph'))
      .slice(0, 1));
  }

  // P4: 음악 감독 (1명)
  if (selectedArtists.length < limit) {
    addToSelection(uniqueArtists
      .filter(a => hasRole(a.roles, 'music', 'composer'))
      .slice(0, 1));
  }

  // 3. 빈자리 채우기 (Backfill)
  const backfillOrder = ['editor', 'production design', 'art', 'costume', 'sound', 'producer'];
  for (const roleTask of backfillOrder) {
    if (selectedArtists.length >= limit) break;
    addToSelection(uniqueArtists.filter(a => hasRole(a.roles, roleTask)));
  }

  // 최종 리스트 구성 및 역할 라벨 통합
  return selectedArtists.map(a => {
    return {
      ...a.credit,
      role: getMergedRoleLabel(a.roles)
    };
  });
}

/**
 * 수집된 역할들을 한글로 변환하고 "감독, 각본" 형태로 결합합니다.
 */
function getMergedRoleLabel(roles: Set<string>): string {
  const labels = new Set<string>();
  const rolesArr = Array.from(roles);

  if (rolesArr.some(r => r.includes('director') || r.includes('directing'))) labels.add('감독');
  if (rolesArr.some(r => r.includes('writing') || r.includes('screenplay') || r.includes('writer'))) labels.add('각본');
  if (rolesArr.some(r => r.includes('actor') || r.includes('acting') || r.includes('cast'))) labels.add('배우');
  if (rolesArr.some(r => r.includes('camera') || r.includes('photograph') || r.includes('cinematographer'))) labels.add('촬영 감독');
  if (rolesArr.some(r => r.includes('music') || r.includes('composer'))) labels.add('음악 감독');
  if (rolesArr.some(r => r.includes('editor') || r.includes('editing'))) labels.add('편집자');
  if (rolesArr.some(r => r.includes('production design') || r.includes('art'))) labels.add('미술 감독');
  if (rolesArr.some(r => r.includes('costume'))) labels.add('의상 디자이너');
  if (rolesArr.some(r => r.includes('sound'))) labels.add('사운드 디자이너');
  if (rolesArr.some(r => r === 'producer')) labels.add('제작');

  const result = Array.from(labels).join(', ');
  return result || Array.from(roles)[0] || '스태프';
}

// Helpers
/**
 * 작품 타입별 한글 라벨 반환
 */
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

/**
 * 역할 코드 -> 한글 역할명 변환 (감독, 작가, 배우 등)
 */
function getRoleLabel(role: string | null | undefined, characterName?: string) {
  if (!role) return characterName || '';
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

/**
 * 러닝타임 포맷팅 (예: 125 -> 2시간 5분)
 */
function formatRuntime(minutes: number | null | undefined) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

/**
 * 국가 코드 -> 한글 국가명 변환
 */
function getCountryName(country: string) {
  if (!country) return '';
  const mapping: Record<string, string> = {
    'US': '미국',
    'KR': '한국',
    'JP': '일본',
    'GB': '영국',
    'FR': '프랑스',
    'DE': '독일',
    'CN': '중국',
    'ES': '스페인',
    'IT': '이탈리아',
    'CA': '캐나다',
    'AU': '호주',
    'IN': '인도',
    'RU': '러시아',
    'HK': '홍콩',
    'TW': '대만',
  };
  return mapping[country.toUpperCase()] || country;
}
