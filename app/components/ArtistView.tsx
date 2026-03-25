'use client';

import React from 'react';
import Link from 'next/link';
import { Artist, Work } from '../types';

interface ArtistViewProps {
  data: Artist;
}

export default function ArtistView({ data }: ArtistViewProps) {
  const imageUrl = data.profile_path 
    ? (data.profile_path.startsWith('http') ? data.profile_path : `https://image.tmdb.org/t/p/w500${data.profile_path}`)
    : '/icons/default_profile.jpg';

  return (
    <div className="flex flex-col bg-white">
      {/* Profile Header */}
      <div className="flex flex-col items-center pt-10 pb-8 px-6">
        <div className="w-[160px] h-[160px] relative mb-6">
          <div className="w-full h-full rounded-full overflow-hidden border border-gray-100 shadow-sm">
            <img
              src={imageUrl}
              className="w-full h-full object-cover"
              alt={data.name}
            />
          </div>
        </div>
        <h1 className="text-[28px] font-black text-black tracking-tighter text-center">
          {data.name}
        </h1>
        <p className="text-[14px] text-gray-400 font-medium mt-1">아티스트</p>
      </div>

      {/* Biography */}
      {data.biography && (
        <div className="px-6 mb-10">
          <div className="bg-gray-50/50 p-6 rounded-[24px] border border-gray-100/50">
            <p className="text-[15px] text-[#333] leading-relaxed whitespace-pre-wrap tracking-tight">
              {data.biography}
            </p>
          </div>
        </div>
      )}

      {/* Works Section */}
      {data.initial_works && data.initial_works.length > 0 && (
        <div className="px-6 mb-16">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[19px] font-bold text-black tracking-tight">참여 작품</h3>
            <span className="text-[13px] text-gray-400 font-medium">{data.initial_works.length}개</span>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-6">
            {data.initial_works.map((work) => (
              <Link 
                key={work.id} 
                href={`/${work.work_type}/${work.id.includes(':') ? work.id.split(':').pop() : work.id}`}
                className="flex flex-col group"
              >
                <div className="aspect-[2/3] relative overflow-hidden rounded-[8px] border border-gray-100 mb-2 transition-transform active:scale-95">
                  <img
                    src={work.image_url}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={work.work_title}
                  />
                  {/* Type Overlay */}
                  <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-md">
                    <span className="text-[9px] font-bold text-white uppercase">{getWorkTypeLabel(work.work_type)}</span>
                  </div>
                </div>
                <span className="text-[13px] font-bold text-black line-clamp-1 leading-tight tracking-tight">
                    {work.work_title}
                </span>
                <span className="text-[11px] text-gray-400 mt-0.5">{work.work_year}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getWorkTypeLabel(type: string) {
    switch (type.toLowerCase()) {
        case 'movie': return 'MOVIE';
        case 'tv': return 'TV';
        case 'album': return 'ALBUM';
        case 'track': return 'TRACK';
        case 'book': return 'BOOK';
        default: return 'WORK';
    }
}
