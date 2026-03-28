'use client';

import React from 'react';
import Link from 'next/link';
import { List, Work } from '../types';

interface ListViewProps {
  data: List;
}

export default function ListView({ data }: ListViewProps) {
  // 리스트 요약 정보 생성 (예: 트랙 2곡, 앨범 3개)
  const formatWorkCounts = (workCounts?: Record<string, number>) => {
    if (!workCounts || Object.keys(workCounts).length === 0) return "";

    return Object.entries(workCounts)
      .map(([type, count]) => {
        if (type === 'track') return `트랙 ${count}곡`;
        if (type === 'album') return `앨범 ${count}개`;
        if (type === 'movie') return `영화 ${count}편`;
        if (type === 'tv') return `TV ${count}편`;
        if (type === 'book') return `책 ${count}권`;
        return `${type} ${count}개`;
      })
      .join(", ");
  };

  const workSummary = formatWorkCounts(data.work_counts);

  return (
    <div className="flex flex-col bg-white min-h-screen pb-20">
      {/* 1. 리스트 썸네일 (Large, Centered) */}
      <div className="flex justify-center pt-8 pb-6 px-10">
        <div className="w-full max-w-[320px] aspect-square overflow-hidden shadow-sm">
          <img
            src={data.cover_url || '/icons/default_profile.jpg'}
            className="w-full h-full object-cover"
            alt={data.title}
          />
        </div>
      </div>

      {/* 2. 리스트 타이틀 (Large, Centered) */}
      <div className="px-10 text-center mb-1">
        <h1 className="text-[24px] font-bold text-black tracking-tight leading-[1.2]">
          {data.title}
        </h1>
      </div>

      {/* 3. 리스트 요약 정보 (Centered) */}
      <div className="px-10 text-center mb-0.5">
        <p className="text-[14px] text-gray-400 font-normal">
          {workSummary}
        </p>
      </div>

      {/* 4. 제작자 프로필 아이디 (Centered) */}
      <div className="px-10 text-center mb-6">
        <Link href={`/profile/${data.user_id}`}>
          <p className="inline-block text-[14px] text-gray-400 font-normal hover:text-black transition-colors cursor-pointer">
            @{data.profiles?.username || 'unknown'}
          </p>
        </Link>
      </div>

      {/* 5. 리스트 설명글 (Full) */}
      {data.description && (
        <div className="px-6 mb-8 text-[15px] text-black leading-[1.6] font-normal tracking-tight whitespace-pre-wrap">
          {data.description}
        </div>
      )}

      {/* 6. 작품 목록 */}
      <div className="flex flex-col pt-2">
        {(data.items || []).map((work) => (
          <Link key={work.id} href={`/work/${work.id}`}>
            <div
              className="flex items-center py-2.5 px-6 active:bg-gray-50 transition-colors cursor-pointer group"
            >
              {/* 작품 썸네일 */}
              <div className="w-[60px] h-[60px] overflow-hidden mr-4 flex-shrink-0">
                <img
                  src={work.image_url || '/icons/default_profile.jpg'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  alt={work.work_title}
                />
              </div>

              {/* 작품 정보 */}
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="text-[15px] font-normal text-black leading-tight line-clamp-1 mb-0.5 group-hover:text-blue-600 transition-colors">
                  {work.work_title}
                </h3>
                <p className="text-[13px] text-gray-400 font-normal truncate">
                  {getWorkTypeLabel(work.work_type)} · {work.artist_name}, {work.work_year}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function getWorkTypeLabel(type: string) {
  switch (type?.toLowerCase()) {
    case 'movie': return '영화';
    case 'tv': return 'TV';
    case 'album': return '앨범';
    case 'track': return '트랙';
    case 'book': return '책';
    default: return '작품';
  }
}
