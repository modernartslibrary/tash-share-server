'use client';

import Link from 'next/link';
import { Artist, SharePreviewUser, SharePreviewWork, Work } from '../types';
import { ArtistFallbackImage, ListFallbackImage, WorkFallbackImage } from './FallbackImage';

const SQUARE_COVER_STYLE = {
  width: 'clamp(204px, 62vw, 352px)',
};

const META_TO_BIO_SPACING = 'mt-4 sm:mt-5';
const SECTION_STACK_SPACING = 'mt-5 sm:mt-6';
const PREVIEW_SECTION_TITLE_CLASS = 'mb-2 flex items-center gap-3';

interface ArtistViewProps {
  data: Artist;
}

export default function ArtistView({ data }: ArtistViewProps) {
  const displayWorks: SharePreviewWork[] = (data.initial_works && data.initial_works.length > 0)
    ? data.initial_works.map(mapWorkToPreview)
    : (data.representative_works || []);
  const likeUsers = data.like_users_preview || [];
  const hasBiography = Boolean(data.biography);

  return (
    <div className="flex flex-col bg-white">
      <div className="flex justify-center px-6 pt-8 pb-6 sm:pt-10">
        <div className="relative mx-auto aspect-square overflow-hidden" style={SQUARE_COVER_STYLE}>
          <ArtistFallbackImage
            src={data.profile_path}
            className="w-full h-full object-cover"
            alt={data.name}
            sizes="(max-width: 672px) 62vw, 352px"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
        </div>
      </div>

      <div className="px-6">
        <h1 className="text-[26px] font-[950] text-black tracking-tighter leading-tight mb-1.5">
          {data.name}
        </h1>
        {(data.birth_date || data.birth_place) && (
          <p className="text-[13px] text-[#6F6F6F] font-normal tracking-tight leading-snug">
            {data.birth_date && formatKoreanDate(data.birth_date)}
            {data.death_date && ` - ${formatKoreanDate(data.death_date)}`}
            {data.birth_place && `${(data.birth_date || data.death_date) ? ', ' : ''}${data.birth_place}`}
          </p>
        )}
      </div>

      {data.biography && (
        <div className={`px-6 ${META_TO_BIO_SPACING}`}>
          <p className="text-[15px] text-black leading-relaxed whitespace-pre-wrap tracking-tight font-normal">
            {data.biography}
          </p>
        </div>
      )}

      <div className={`px-6 ${hasBiography ? SECTION_STACK_SPACING : META_TO_BIO_SPACING}`}>
        <PreviewSectionTitle title="작품들" showMore />
        {displayWorks.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-4 min-w-max">
              {displayWorks.map((work) => (
                <Link
                  key={work.id}
                  href={`/work/${work.slug || work.id}`}
                  className="link-trigger flex w-[124px] sm:w-[140px] flex-col"
                >
                  <div className="aspect-square overflow-hidden border border-gray-100 bg-gray-50">
                    <WorkFallbackImage
                      src={work.image_url}
                      className="w-full h-full object-cover"
                      alt={work.work_title}
                      sizes="140px"
                    />
                  </div>
                  <span className="mt-1.5 text-[14px] leading-tight text-black line-clamp-2 tracking-tight">
                    {work.work_title}
                  </span>
                  <span className="mt-0.5 text-[12px] text-[#6F6F6F] tracking-tight">
                    {work.work_year ?? ''}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyPreviewText text="등록된 대표작이 없습니다" />
        )}
      </div>

      <div className={`px-6 ${SECTION_STACK_SPACING} pb-3 sm:pb-4`}>
        <PreviewSectionTitle title="이 아티스트를 아카이브에 담은 사람" showMore />
        {likeUsers.length > 0 ? (
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-4 min-w-max">
              {likeUsers.map((user) => (
                <PreviewUserCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        ) : (
          <EmptyPreviewText text="아직 아카이브에 담은 사용자가 없습니다" />
        )}
      </div>
    </div>
  );
}

function PreviewSectionTitle({ title, showMore = false }: { title: string; showMore?: boolean }) {
  return (
    <div className={PREVIEW_SECTION_TITLE_CLASS}>
      <h3 className="text-[17px] sm:text-[18px] font-bold text-black tracking-tight">
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

function PreviewUserCard({ user }: { user: SharePreviewUser }) {
  const label = user.username || user.nickname || 'Unknown';
  const content = (
    <div className="flex w-[60px] flex-col items-center text-center">
      <div className="h-[52px] w-[52px] overflow-hidden rounded-full border border-gray-100 bg-gray-50">
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
    <Link href={`/profile/${user.username}`} data-allow-navigation="true" className="block">
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

function mapWorkToPreview(work: Work): SharePreviewWork {
  return {
    id: work.id,
    slug: work.slug,
    work_title: work.work_title,
    artist_name: work.artist_name,
    work_year: work.work_year,
    image_url: work.image_url,
    work_type: work.work_type,
  };
}

function formatKoreanDate(dateStr: string) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}
