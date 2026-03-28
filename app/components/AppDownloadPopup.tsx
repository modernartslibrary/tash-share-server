'use client';

import React from 'react';

interface AppDownloadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  type?: string;
  id?: string;
}

export default function AppDownloadPopup({ isOpen, onClose, type, id }: AppDownloadPopupProps) {
  if (!isOpen) return null;

  const handleOpenApp = () => {
    const workTypes = ['movie', 'tv', 'track', 'album', 'book'];
    const mappedType = type === 'user' ? 'profile' : (type && workTypes.includes(type) ? 'work' : type || 'home');
    const deepLink = `io.supabase.tash:/${mappedType}/${id || ''}`;

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[24px] w-full max-w-[320px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-8 flex flex-col items-center text-center">
          <img src="/icons/app_logo.png" className="h-8 mb-6" alt="TASH" />

          <h3 className="text-[18px] font-bold text-black mb-2 tracking-tight">
            앱에서 확인하시겠어요?
          </h3>
          <p className="text-[14px] text-gray-500 mb-8 leading-relaxed">
            작품 상세 정보, 기록, 아카이브 등<br />
            모든 기능을 제한 없이 이용할 수 있습니다.
          </p>

          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleOpenApp}
              className="w-full bg-black text-white h-[56px] rounded-full text-[16px] font-bold active:scale-95 transition-all"
            >
              tash 앱 열기
            </button>
            <button
              onClick={onClose}
              className="w-full bg-white text-gray-400 h-[50px] rounded-full text-[14px] font-medium active:scale-95 transition-all"
            >
              웹에서 계속 보기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
