'use client';

import React, { useState } from 'react';
import AppDownloadPopup from './AppDownloadPopup';
import Link from 'next/link';

interface SharePageClientProps {
  type: string;
  id: string;
  children: React.ReactNode;
}

export default function SharePageClient({ type, id, children }: SharePageClientProps) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const handleOpenApp = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    // Deep Link Logic (Same as in AppDownloadPopup for consistency)
    const workTypes = ['movie', 'tv', 'track', 'album', 'book'];
    const mappedType = type === 'user' ? 'profile' : (workTypes.includes(type) ? 'work' : type);
    const deepLink = `io.supabase.tash:/${mappedType}/${id}`;

    const playStoreUrl = `https://play.google.com/store/apps/details?id=com.MAL.tash`;
    const appStoreUrl = `https://apps.apple.com/app/tash/id6755390469`;

    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isAndroid = /android/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    window.location.href = deepLink;

    const start = Date.now();
    setTimeout(() => {
      if (Date.now() - start < 3000) {
        if (isAndroid) {
          window.location.href = playStoreUrl;
        } else if (isIOS) {
          window.location.href = appStoreUrl;
        } else {
          window.location.href = 'https://tash.kr/download';
        }
      }
    }, 2500);
  };

  const showPopup = (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
        e.nativeEvent.stopImmediatePropagation();
      }
    }
    setIsPopupOpen(true);
  };

  const touchStartRef = React.useRef<{ x: number, y: number } | null>(null);

  // Use a global capture listener to ensure we catch all link clicks before Next.js handles them
  React.useEffect(() => {
    const DRAG_THRESHOLD = 10;

    const handleGlobalClick = (e: MouseEvent) => {
      // For desktop/mouse clicks, we still want immediate interception
      const target = e.target as HTMLElement;
      const trigger = target.closest('.link-trigger');
      if (trigger) {
        showPopup(e);
      }
    };

    const handleGlobalTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < DRAG_THRESHOLD) {
        // Only trigger if it's a tap (small movement)
        const target = e.target as HTMLElement;
        const trigger = target.closest('.link-trigger');
        if (trigger) {
          showPopup(e);
        }
      }

      touchStartRef.current = null;
    };

    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('touchstart', handleGlobalTouchStart, { capture: true, passive: true });
    window.addEventListener('touchend', handleGlobalTouchEnd, { capture: true, passive: false });

    return () => {
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('touchstart', handleGlobalTouchStart, true);
      window.removeEventListener('touchend', handleGlobalTouchEnd, true);
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
          <div className="h-3 w-[1px] bg-gray-200 mx-1" />
          <span className="text-[13px] font-medium text-gray-500 tracking-tight">tash – 취향의 기록과 축적, 연결</span>
        </div>

        <button
          onClick={() => handleOpenApp()}
          className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center active:scale-90 transition-transform"
        >
          <span className="text-[20px] font-light leading-none mb-0.5">+</span>
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
