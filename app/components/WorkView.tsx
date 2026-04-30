'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Credit, SharePreviewList, SharePreviewPost, SharePreviewUser, Work } from '../types';
import { ArtistFallbackImage, ListFallbackImage, WorkFallbackImage } from './FallbackImage';

const SQUARE_COVER_STYLE = {
  width: 'clamp(204px, 62vw, 352px)',
};

const POSTER_COVER_STYLE = {
  width: 'clamp(174px, 49vw, 266px)',
};

const META_TO_BIO_SPACING = 'mt-4 sm:mt-5';
const SECTION_STACK_CLASS = 'mt-5 sm:mt-6 flex flex-col gap-5 sm:gap-6';
const PREVIEW_SECTION_TITLE_CLASS = 'mb-2 flex items-center gap-3';
const DENSE_SECTION_TITLE_CLASS = 'mb-1.5';

interface WorkViewProps {
  data: Work;
}

export default function WorkView({ data }: WorkViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const curatedCredits = (data.work_type === 'movie' || data.work_type === 'tv')
    ? getCuratedCredits(data.credits || [], isExpanded ? 0 : 6)
    : data.credits || [];

  switch (data.work_type?.toLowerCase()) {
    case 'movie':
    case 'tv':
      return (
        <MovieLayout
          data={data}
          curatedCredits={curatedCredits}
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded(!isExpanded)}
        />
      );
    case 'album':
      return <AlbumLayout data={data} curatedCredits={curatedCredits} />;
    case 'track':
      return <TrackLayout data={data} curatedCredits={curatedCredits} />;
    case 'book':
      return <BookLayout data={data} />;
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
  onToggle: () => void;
}) {
  const hasMore = (data.credits?.length || 0) > curatedCredits.length || isExpanded;
  const hasBiography = Boolean(data.biography);

  return (
    <div className="flex flex-col bg-white">
      <div className="flex justify-center pt-8 pb-6 px-6 sm:pt-10">
        <div className="aspect-[2/3] relative overflow-hidden" style={POSTER_COVER_STYLE}>
          <WorkFallbackImage
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
            sizes="(max-width: 672px) 49vw, 266px"
            loading="eager"
          />
        </div>
      </div>

      <div className="px-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-[26px] font-[950] text-black leading-[1.2] tracking-tighter">
            {data.work_title}
          </h1>
          {data.rating_count && data.rating_count > 0 ? (
            <div className="flex items-center text-[13px] font-bold text-black mt-1">
              <Image src="/icons/star_icon.png" className="mr-[2px]" alt="star" width={11} height={11} />
              <span>{data.rating_avg?.toFixed(1)}</span>
              <span className="text-black ml-[2px] text-[13px]">({data.rating_count})</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-0 mt-2">
          <p className="text-[12px] text-[#6F6F6F] font-normal tracking-tight">
            {getCategoryLabel(data.work_type)} · {data.artist_name}{data.work_year ? `, ${data.work_year}` : ''}
          </p>
          <p className="text-[12px] text-[#6F6F6F] font-normal tracking-tight leading-none">
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

      {data.biography && (
        <div className={`px-5 ${META_TO_BIO_SPACING}`}>
          <p className="text-[15px] text-[#222] leading-normal whitespace-pre-wrap tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      <div className={hasBiography ? SECTION_STACK_CLASS : `${META_TO_BIO_SPACING} flex flex-col gap-5 sm:gap-6`}>
        {curatedCredits.length > 0 && (
          <div className="px-5">
            <div className={`flex items-center gap-3 ${DENSE_SECTION_TITLE_CLASS}`}>
              <h3 className="text-[18px] font-bold text-black">크레딧</h3>
              {hasMore && (
                <button
                  onClick={onToggle}
                  className="text-[14px] text-[#6F6F6F] font-normal"
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
                  prefetch={false}
                  className="link-trigger flex items-center gap-2 group cursor-pointer"
                >
                  <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 flex-shrink-0">
                    <ArtistFallbackImage
                      src={credit.profile_path}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={credit.name}
                      sizes="64px"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] text-black truncate font-normal group-hover:underline">{credit.name}</span>
                    <span className="text-[12px] text-[#6F6F6F] truncate">{credit.role}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <WorkPreviewSections data={data} />
      </div>
    </div>
  );
}

function AlbumLayout({ data, curatedCredits }: { data: Work; curatedCredits: Credit[] }) {
  const hasBiography = Boolean(data.biography);

  return (
    <div className="flex flex-col bg-white">
      <div className="flex justify-center pt-8 pb-6 px-6 sm:pt-10">
        <div
          className="aspect-square relative overflow-hidden mx-auto"
          style={SQUARE_COVER_STYLE}
        >
          <WorkFallbackImage
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
            sizes="(max-width: 672px) 62vw, 352px"
            loading="eager"
          />
        </div>
      </div>

      <div className="px-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-[26px] font-[950] text-black leading-[1.2] tracking-tight">
            {data.work_title}
          </h1>
        </div>
        <div className="flex flex-col">
          <p className="text-[12px] text-[#6F6F6F] font-normal tracking-tight leading-none mb-1">
            앨범 · {data.display_artist_name || data.artist_name}{data.work_year ? ` · ${data.work_year}` : ''}
          </p>
          <p className="text-[12px] text-[#6F6F6F] font-normal tracking-tight leading-none">
            {data.genres?.join(', ')}
          </p>
        </div>
      </div>

      {data.biography && (
        <div className={`px-5 ${META_TO_BIO_SPACING}`}>
          <p className="text-[15px] text-[#222] leading-normal whitespace-pre-wrap tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      <div className={hasBiography ? SECTION_STACK_CLASS : `${META_TO_BIO_SPACING} flex flex-col gap-5 sm:gap-6`}>
        {data.tracks_cache && data.tracks_cache.length > 0 && (
          <div className="px-5">
            <div className={`flex items-center gap-2 ${DENSE_SECTION_TITLE_CLASS}`}>
              <h3 className="text-[14px] font-normal text-black">트랙 리스트</h3>
            </div>
            <div className="flex flex-col">
              {data.tracks_cache.map((track) => (
                <div
                  key={track.id}
                  className="link-trigger flex items-start py-0.5 gap-2 cursor-pointer"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <span className="text-[14px] font-normal text-black w-6 text-left">{track.track_number}.</span>
                    <div className="flex flex-col flex-1 pl-1 min-w-0">
                      <span className="text-[14px] font-normal text-black line-clamp-1 tracking-tighter">{track.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 pt-[2px]">
                    <Image
                      src="/icons/backIcon_right.png"
                      alt="arrow"
                      width={10}
                      height={10}
                      className="object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {curatedCredits.length > 0 && (
          <div className="px-5">
            <h3 className={`text-[18px] font-bold text-black ${DENSE_SECTION_TITLE_CLASS}`}>크레딧</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
              {curatedCredits.map((credit, idx) => (
                <Link
                  key={credit.id || `credit-${idx}`}
                  href={`/artist/${credit.slug || credit.id}`}
                  prefetch={false}
                  className="link-trigger flex items-center gap-2 group cursor-pointer"
                >
                  <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 flex-shrink-0">
                    <ArtistFallbackImage
                      src={credit.profile_path}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={credit.name}
                      sizes="64px"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] text-black truncate font-normal group-hover:underline">{credit.name}</span>
                    <span className="text-[12px] text-[#6F6F6F] truncate">{getRoleLabel(credit.role)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <WorkPreviewSections data={data} />
      </div>
    </div>
  );
}

function TrackLayout({ data, curatedCredits }: { data: Work; curatedCredits: Credit[] }) {
  const hasBiography = Boolean(data.biography);

  return (
    <div className="flex flex-col bg-white">
      <div className="flex justify-center pt-8 pb-6 px-6 sm:pt-10">
        <div
          className="aspect-square relative overflow-hidden"
          style={SQUARE_COVER_STYLE}
        >
          <WorkFallbackImage
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
            sizes="(max-width: 672px) 62vw, 352px"
            loading="eager"
          />
        </div>
      </div>

      <div className="px-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-[26px] font-[950] text-black leading-[1.2] tracking-tight">
            {data.work_title}
          </h1>
        </div>
        <div className="flex flex-col">
          <p className="text-[12px] text-[#6F6F6F] font-normal tracking-tight leading-none">
            곡 · {data.display_artist_name || data.artist_name}{data.work_year ? ` · ${data.work_year}` : ''}
          </p>
        </div>
      </div>

      {data.biography && (
        <div className={`px-5 ${META_TO_BIO_SPACING}`}>
          <p className="text-[15px] text-[#222] leading-normal whitespace-pre-wrap tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      <div className={hasBiography ? SECTION_STACK_CLASS : `${META_TO_BIO_SPACING} flex flex-col gap-5 sm:gap-6`}>
        {data.parent_album_cache && (
          <div className="px-5">
            <Link
              href={`/work/${data.parent_album_cache.slug || data.parent_album_cache.id}`}
              prefetch={false}
              className="link-trigger flex items-center transition-colors cursor-pointer"
            >
              <div className="w-[64px] h-[64px] overflow-hidden flex-shrink-0">
                <WorkFallbackImage
                  src={data.parent_album_cache.poster_path}
                  className="w-full h-full object-cover"
                  alt="album cover"
                  sizes="64px"
                />
              </div>
              <div className="flex flex-col pl-4 min-w-0">
                <span className="text-[15px] font-normal text-black truncate tracking-tight">{data.parent_album_cache.title}</span>
                <span className="text-[12px] text-[#6F6F6F] truncate tracking-tight">{data.parent_album_cache.artist_names_display}</span>
              </div>
            </Link>
          </div>
        )}

        {curatedCredits.length > 0 && (
          <div className="px-5">
            <h3 className={`text-[18px] font-bold text-black ${DENSE_SECTION_TITLE_CLASS}`}>크레딧</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4" style={{ rowGap: '13px' }}>
              {curatedCredits.map((credit, idx) => (
                <div
                  key={credit.id || `credit-${idx}`}
                  className="link-trigger flex items-center gap-2 group cursor-pointer"
                >
                  <div className="w-[64px] h-[64px] overflow-hidden bg-gray-50 flex-shrink-0">
                    <ArtistFallbackImage
                      src={credit.profile_path}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={credit.name}
                      sizes="64px"
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[14px] text-black truncate font-normal group-hover:underline">{credit.name}</span>
                    <span className="text-[12px] text-[#6F6F6F] truncate">{getRoleLabel(credit.role)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <WorkPreviewSections data={data} />
      </div>
    </div>
  );
}

function BookLayout({ data }: { data: Work }) {
  const hasBiography = Boolean(data.biography);

  return (
    <div className="flex flex-col bg-white">
      <div className="flex justify-center pt-8 pb-6 px-5 sm:pt-10">
        <div className="aspect-[10/16] relative overflow-hidden bg-white" style={POSTER_COVER_STYLE}>
          <WorkFallbackImage
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
            sizes="(max-width: 672px) 49vw, 266px"
            loading="eager"
          />
        </div>
      </div>

      <div className="px-5">
        <h1 className="text-[26px] font-[950] text-black leading-[1.2] mb-2 tracking-tighter">
          {data.work_title}
        </h1>
        <p className="text-[12px] text-[#6F6F6F] font-normal tracking-tight">
          {getCategoryLabel(data.work_type)} · {data.artist_name}, {data.work_year}
        </p>
      </div>

      {data.biography && (
        <div className={`px-5 ${META_TO_BIO_SPACING}`}>
          <p className="text-[15px] text-[#222] leading-normal whitespace-pre-wrap font-normal tracking-[-0.05em]">
            {data.biography}
          </p>
        </div>
      )}

      <div className={hasBiography ? SECTION_STACK_CLASS : `${META_TO_BIO_SPACING} flex flex-col gap-5 sm:gap-6`}>
        <WorkPreviewSections data={data} />
      </div>
    </div>
  );
}

function DefaultLayout({ data }: { data: Work }) {
  return (
    <div className="flex flex-col bg-white">
      <div className="flex flex-col items-center pt-8 pb-6 px-5 sm:pt-10">
        <div className="aspect-square relative rounded-[16px] overflow-hidden mb-8" style={SQUARE_COVER_STYLE}>
          <WorkFallbackImage
            src={data.image_url}
            className="w-full h-full object-cover"
            alt={data.work_title}
            sizes="(max-width: 672px) 62vw, 352px"
            loading="eager"
          />
        </div>
        <h1 className="text-2xl font-bold mb-1 text-center">{data.work_title}</h1>
        <p className="text-[#6F6F6F] mb-8">{data.artist_name}</p>
      </div>

      <WorkPreviewSections data={data} />
    </div>
  );
}

function WorkPreviewSections({ data }: { data: Work }) {
  const posts = data.posts_preview || [];
  const likeUsers = data.like_users_preview || [];
  const lists = data.lists_preview || [];

  return (
    <div className="px-5 pb-3 sm:pb-4">
      <div>
        <PreviewSectionTitle title="포스트" showMore />
        {posts.length > 0 ? (
          <div className="flex flex-col gap-5">
            {posts.slice(0, 3).map((post) => (
              <PreviewPostRow key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <EmptyPreviewText text="아직 포스트가 없습니다" />
        )}
      </div>

      <div className="mt-5 sm:mt-6">
        <PreviewSectionTitle title="이 작품을 아카이브한 사람" showMore />
        {likeUsers.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-4 min-w-max">
              {likeUsers.map((user) => (
                <PreviewUserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyPreviewText text="아직 이 작품을 아카이브한 사람이 없습니다" />
        )}
      </div>

      <div className="mt-5 sm:mt-6">
        <PreviewSectionTitle title="이 작품이 포함된 리스트" showMore />
        {lists.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-4 min-w-max">
              {lists.map((list) => (
                <PreviewListCard key={list.id} list={list} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyPreviewText text="아직 이 작품이 포함된 리스트가 없습니다" />
        )}
      </div>
    </div>
  );
}

function PreviewSectionTitle({ title, showMore = false }: { title: string; showMore?: boolean }) {
  return (
    <div className={PREVIEW_SECTION_TITLE_CLASS}>
      <h3 className="text-[17px] sm:text-[18px] font-bold text-black">
        {title}
      </h3>
      {showMore && (
        <button
          type="button"
          className="link-trigger text-[13px] text-[#6F6F6F] font-normal tracking-tight"
        >
          모두보기
        </button>
      )}
    </div>
  );
}

function PreviewPostRow({ post }: { post: SharePreviewPost }) {
  const username = post.profiles?.username || post.profiles?.nickname || 'Unknown';
  const avatarAlt = post.profiles?.username || post.profiles?.nickname || 'profile';
  const trimmedContent = post.content?.trim();
  const content = (
    <div className={`flex gap-3 ${trimmedContent ? 'items-start' : 'items-center'}`}>
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-50">
        <ListFallbackImage
          src={post.profiles?.avatar_url}
          className="h-full w-full object-cover"
          alt={avatarAlt}
          sizes="40px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0">
          <span className="text-[15px] font-semibold text-black line-clamp-1">{username}</span>
          <span className="text-[12px] text-[#6F6F6F] shrink-0">{formatTimeAgo(post.created_at)}</span>
        </div>
        {trimmedContent && (
          <p className="text-[15px] leading-[1.45] text-[#1A1A1A] whitespace-pre-wrap line-clamp-2 tracking-tight">
            {post.content}
          </p>
        )}
      </div>
    </div>
  );

  if (!post.slug && !post.id) {
    return content;
  }

  return (
    <Link href={`/post/${post.slug || post.id}`} prefetch={false} data-allow-navigation="true" className="block">
      {content}
    </Link>
  );
}

function PreviewUserCard({ user }: { user: SharePreviewUser }) {
  const label = user.username || user.nickname || 'Unknown';
  const content = (
    <div className="flex w-[60px] flex-col items-center text-center">
      <div className="h-[52px] w-[52px] overflow-hidden rounded-full bg-gray-50">
        <ListFallbackImage
          src={user.avatar_url}
          className="h-full w-full object-cover"
          alt={label}
          sizes="52px"
        />
      </div>
      <span className="mt-1.5 text-[13px] font-medium text-black line-clamp-1 w-full tracking-tight">
        {label}
      </span>
    </div>
  );

  if (!user.username) {
    return content;
  }

  return (
    <Link href={`/profile/${user.username}`} prefetch={false} data-allow-navigation="true" className="block">
      {content}
    </Link>
  );
}

function PreviewListCard({ list }: { list: SharePreviewList }) {
  const content = (
    <div className="flex w-[124px] sm:w-[140px] flex-col">
      <div className="aspect-square overflow-hidden bg-gray-50">
        <ListFallbackImage
          src={list.cover_url}
          className="h-full w-full object-cover"
          alt={list.title}
          sizes="140px"
        />
      </div>
      <span className="mt-1.5 text-[14px] leading-tight text-black line-clamp-2 tracking-tight">
        {list.title}
      </span>
      <span className="mt-0.5 text-[12px] text-[#6F6F6F] tracking-tight line-clamp-1">
        {list.username || ''}
      </span>
    </div>
  );

  return (
    <Link href={`/list/${list.slug || list.id}`} prefetch={false} data-allow-navigation="true" className="block">
      {content}
    </Link>
  );
}

function EmptyPreviewText({ text }: { text: string }) {
  return (
    <p className="text-[15px] text-[#6F6F6F] leading-relaxed tracking-tight">
      {text}
    </p>
  );
}

function formatTimeAgo(dateString: string | undefined) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}개월 전`;
  return `${Math.floor(diffInSeconds / 31536000)}년 전`;
}

function getCuratedCredits(credits: Credit[], limit: number = 0): Credit[] {
  if (!credits || credits.length === 0) return [];

  const artistMap = new Map<string, { credit: Credit; roles: Set<string> }>();

  credits.forEach(c => {
    if (!artistMap.has(c.id)) {
      artistMap.set(c.id, { credit: { ...c }, roles: new Set() });
    }
    artistMap.get(c.id)!.roles.add(c.role.toLowerCase());
  });

  const uniqueArtists = Array.from(artistMap.values());

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

  addToSelection(uniqueArtists
    .filter(a => hasRole(a.roles, 'director', 'writing', 'screenplay', 'writer'))
    .slice(0, 2));

  if (selectedArtists.length < limit) {
    addToSelection(uniqueArtists
      .filter(a => hasRole(a.roles, 'cast', 'actor'))
      .slice(0, 2));
  }

  if (selectedArtists.length < limit) {
    addToSelection(uniqueArtists
      .filter(a => hasRole(a.roles, 'cinematography', 'camera', 'photograph'))
      .slice(0, 1));
  }

  if (selectedArtists.length < limit) {
    addToSelection(uniqueArtists
      .filter(a => hasRole(a.roles, 'music', 'composer'))
      .slice(0, 1));
  }

  const backfillOrder = ['editor', 'production design', 'art', 'costume', 'sound', 'producer'];
  for (const roleTask of backfillOrder) {
    if (selectedArtists.length >= limit) break;
    addToSelection(uniqueArtists.filter(a => hasRole(a.roles, roleTask)));
  }

  return selectedArtists.map(a => {
    return {
      ...a.credit,
      role: getMergedRoleLabel(a.roles)
    };
  });
}

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

function formatRuntime(minutes: number | null | undefined) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function getCountryName(country: string) {
  if (!country) return '';
  const mapping: Record<string, string> = {
    'US': '미국',
    'KR': '대한민국',
    'GB': '영국',
    'JP': '일본',
    'CN': '중국',
    'FR': '프랑스',
    'DE': '독일',
    'IT': '이탈리아',
    'ES': '스페인',
    'CA': '캐나다',
    'AU': '호주',
    'IN': '인도',
    'BR': '브라질',
    'MX': '멕시코',
    'RU': '러시아',
    'TH': '태국',
    'VN': '베트남',
    'PH': '필리핀',
    'ID': '인도네시아',
    'MY': '말레이시아',
    'SG': '싱가포르',
    'TW': '대만',
    'HK': '홍콩',
    'NL': '네덜란드',
    'BE': '벨기에',
    'CH': '스위스',
    'AT': '오스트리아',
    'SE': '스웨덴',
    'NO': '노르웨이',
    'DK': '덴마크',
    'FI': '핀란드',
    'PL': '폴란드',
    'CZ': '체코',
    'HU': '헝가리',
    'GR': '그리스',
    'TR': '터키',
    'IL': '이스라엘',
    'EG': '이집트',
    'ZA': '남아프리카공화국',
    'NG': '나이지리아',
    'AR': '아르헨티나',
    'CL': '칠레',
    'CO': '콜롬비아',
    'PE': '페루',
    'PT': '포르투갈',
    'IE': '아일랜드',
    'NZ': '뉴질랜드',
  };
  return mapping[country.toUpperCase()] || country;
}
