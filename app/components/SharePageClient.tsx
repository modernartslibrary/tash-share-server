'use client';

import React, { useState } from 'react';
import AppDownloadPopup from './AppDownloadPopup';
import Link from 'next/link';

interface SharePageClientProps {
  type: string;
  id: string; // UUID (또는 fallback 시 slug)
  slug?: string; // 오리지널 슬러그
  children: React.ReactNode;
}

export default function SharePageClient({ type, id, slug, children }: SharePageClientProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleOpenApp = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    const workTypes = ['movie', 'tv', 'track', 'album', 'book'];
    const mappedType = type === 'user' ? 'profile' : (workTypes.includes(type) ? 'work' : type);
    
    // 분석 및 폴백을 위한 쿼리 파라미터 구성
    const queryParams = new URLSearchParams();
    if (slug) queryParams.set('slug', slug);
    queryParams.set('from', 'web');
    const queryString = queryParams.toString();

    // ✅ 커스텀 URL 스킴 주소 구성 (동일 도메인에서 앱을 깨우기 위해 필수)
    const customSchemeUrl = (type === 'home' || !id)
      ? `io.supabase.tash://open-app/home`
      : `io.supabase.tash://open-app/${mappedType}/${id}?${queryString}`;

    // ✅ 커스텀 스킴으로 앱 실행 시도 (앱이 있으면 열림, 없으면 아무 동작 안 함)
    window.location.href = customSchemeUrl;
    
    // 버튼 클릭 후 팝업 닫기 (UX 개선)
    setIsPopupOpen(false);
  };

  const showPopup = (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
        e.nativeEvent.stopImmediatePropagation();
      }
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }
    setIsPopupOpen(true);
  };

  const touchStartRef = React.useRef<{ x: number, y: number } | null>(null);

  // Use a global click listener to catch link-trigger clicks
  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest('.link-trigger');

      if (trigger) {
        showPopup(e);
      }
    };

    // 캡처링(capture) 단계에서 리스너를 등록하여 Next.js Link의 기본 동작보다 먼저 가로챔
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, [type, id]);

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-12">
      {/* Header with CTA */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md flex items-center justify-between px-5 z-50 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="link-trigger cursor-pointer">
            <img src="/icons/app_logo.png" className="h-5 object-contain" alt="tash" />
          </div>
          <span className="text-[13px] font-medium text-black tracking-tight">tash – 취향의 기록과 축적, 연결</span>
        </div>

        <button
          onClick={(e) => showPopup(e)}
          className="px-4 h-8 rounded-full bg-black text-white flex items-center justify-center active:scale-90 transition-transform text-[13px] font-semibold"
        >
          열기
        </button>
      </header>

      <main className="pt-14 px-0 max-w-2xl mx-auto">
        <div>
          {children}
        </div>
      </main>

      <AppDownloadPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        type={type}
        id={id}
      />
    </div>
  );
}
