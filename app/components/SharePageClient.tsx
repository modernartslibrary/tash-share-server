'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import AppDownloadPopup from './AppDownloadPopup';

interface SharePageClientProps {
  type: string;
  id: string; // UUID (또는 fallback 시 slug)
  slug?: string; // 오리지널 슬러그
  children: React.ReactNode;
}

export default function SharePageClient({ type, id, slug, children }: SharePageClientProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const showPopup = (e?: React.MouseEvent | MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
      const nativeEvent = 'nativeEvent' in e ? e.nativeEvent : e;
      if ('stopImmediatePropagation' in nativeEvent && typeof nativeEvent.stopImmediatePropagation === 'function') {
        nativeEvent.stopImmediatePropagation();
      }
    }
    setIsPopupOpen(true);
  };

  // Use a global click listener to catch link-trigger clicks
  React.useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const trigger = target.closest('.link-trigger');
      const detailLink = target.closest('a[href^="/work/"], a[href^="/artist/"]');

      if (trigger || detailLink) {
        showPopup(e);
      }
    };

    // 캡처링(capture) 단계에서 리스너를 등록하여 Next.js Link의 기본 동작보다 먼저 가로챔
    window.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-black font-sans pb-12">
      {/* Header with CTA */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md flex items-center justify-between px-5 z-50 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="link-trigger cursor-pointer">
            <Image src="/icons/app_logo.png" className="h-5 w-auto object-contain" alt="tash" width={64} height={20} />
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
        slug={slug}
      />
    </div>
  );
}
