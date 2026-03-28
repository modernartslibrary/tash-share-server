'use client';

import React from 'react';
import { Artist, Work } from '../types';

interface ArtistViewProps {
  data: Artist;
}

export default function ArtistView({ data }: ArtistViewProps) {
  const imageUrl = data.profile_path
    ? (data.profile_path.startsWith('http') ? data.profile_path : `https://image.tmdb.org/t/p/original${data.profile_path}`)
    : '/icons/default_profile.jpg';

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Header */}
      {/* Hero Header */}
      <div className="relative w-full sm:max-w-[450px] sm:mx-auto aspect-square overflow-hidden mb-6">
        <img
          src={imageUrl}
          className="w-full h-full object-cover"
          alt={data.name}
        />
        {/* Subtle Gradient Overlay for Premium Feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
      </div>

      {/* Name Section */}
      <div className="px-6 mb-2">
        <h1 className="text-[26px] font-black text-black tracking-tighter leading-tight">
          {data.name}
        </h1>
      </div>

      {/* Biography */}
      {data.biography && (
        <div className="px-6 mb-8">
          <p className="text-[15px] text-black leading-relaxed whitespace-pre-wrap tracking-tight font-normal">
            {data.biography}
          </p>
        </div>
      )}

      {/* Works Section → 앱 유도 링크 */}
      {data.initial_works && data.initial_works.length > 0 && (
        <div className="px-6 mb-20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[20px] font-bold text-black tracking-tight">작품들</h3>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-x-3 gap-y-0" style={{ rowGap: '0px' }}>
            {data.initial_works.map((work) => (
              <div
                key={work.id}
                className="link-trigger flex flex-col group cursor-pointer"
                style={{ marginBottom: '12px' }}
              >
                <div
                  className="aspect-square relative overflow-hidden border border-gray-100/50 mb-2.5 transition-transform active:scale-95"
                  style={{ aspectRatio: '1 / 1' }}
                >
                  <img
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
              </div>
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
