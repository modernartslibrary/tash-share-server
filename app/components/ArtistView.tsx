'use client';

import React from 'react';
import Link from 'next/link';
import { Artist, Work } from '../types';
import { ArtistFallbackImage, WorkFallbackImage } from './FallbackImage';

interface ArtistViewProps {
  data: Artist;
}

export default function ArtistView({ data }: ArtistViewProps) {
  // 표시할 작품 목록 선정 (initial_works가 있으면 우선, 없으면 representative_works 사용)
  const displayWorks: Work[] = (data.initial_works && data.initial_works.length > 0) 
    ? data.initial_works 
    : ((data.representative_works || []) as Work[]);

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Header */}
      <div className="relative w-full sm:max-w-[450px] sm:mx-auto aspect-square overflow-hidden mb-4">
        <ArtistFallbackImage
          src={data.profile_path}
          className="w-full h-full object-cover"
          alt={data.name}
        />
        {/* Subtle Gradient Overlay for Premium Feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
      </div>

      {/* Name Section */}
      <div className="px-6 mb-4">
        <h1 className="text-[26px] font-black text-black tracking-tighter leading-tight mb-1.5">
          {data.name}
        </h1>
        {/* Metadata: 生卒年, 出生地 */}
        {(data.birth_date || data.birth_place) && (
          <p className="text-[13px] text-gray-500 font-normal tracking-tight leading-snug">
            {data.birth_date && formatKoreanDate(data.birth_date)}
            {data.death_date && ` - ${formatKoreanDate(data.death_date)}`}
            {data.birth_place && `${(data.birth_date || data.death_date) ? ', ' : ''}${data.birth_place}`}
          </p>
        )}
      </div>

      {/* Biography */}
      {data.biography && (
        <div className="px-6 mb-8">
          <p className="text-[15px] text-black leading-relaxed whitespace-pre-wrap tracking-tight font-normal">
            {data.biography}
          </p>
        </div>
      )}

      {/* Works Section */}
      {displayWorks.length > 0 && (
        <div className="px-6 mb-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[20px] font-bold text-black tracking-tight">작품들</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-0" style={{ rowGap: '0px' }}>
            {displayWorks.slice(0, 7).map((work) => (
              <Link
                key={work.id}
                href={`/work/${work.slug || work.id}`}
                className="link-trigger flex flex-col group cursor-pointer"
                style={{ marginBottom: '12px' }}
              >
                <div
                  className="aspect-square relative overflow-hidden border border-gray-100/50 mb-2.5 transition-transform active:scale-95"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <WorkFallbackImage
                    src={work.image_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={work.work_title}
                  />
                </div>
                <div className="text-[13px] font-normal text-black line-clamp-1 leading-none tracking-tighter">
                  {work.work_title}
                </div>
                <div className="text-[11px] text-gray-400 mt-0 font-light" style={{ marginTop: '4px' }}>
                  {work.work_year}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 'YYYY-MM-DD' -> 'YYYY년 M월 D일' 변환
 */
function formatKoreanDate(dateStr: string) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}
