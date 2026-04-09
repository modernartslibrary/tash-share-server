'use client';

import { useCallback } from 'react';

/**
 * 딥링크 실행 및 스마트 폴백을 관리하는 커스텀 훅
 */
export function useDeepLink() {
  const openApp = useCallback((args: {
    type: string;
    id: string;
    slug?: string;
    onClose?: () => void;
  }) => {
    const { type, id, slug, onClose } = args;

    // 1. URL 구성
    const workTypes = ['movie', 'tv', 'track', 'album', 'book'];
    const mappedType = type === 'user' ? 'profile' : (workTypes.includes(type) ? 'work' : type);
    
    const queryParams = new URLSearchParams();
    if (slug) queryParams.set('slug', slug);
    queryParams.set('from', 'web');
    const queryString = queryParams.toString();

    // 커스텀 스킴: 동일 도메인 제약을 우회하기 위해 우선 시도
    const customSchemeUrl = (type === 'home' || !id)
      ? `io.supabase.tash://open-app/home`
      : `io.supabase.tash://open-app/${mappedType}/${id}?${queryString}`;

    // 유니버설 링크: 앱 미설치 시 서버 사이드 리다이렉트를 위한 폴백
    const universalLinkUrl = (type === 'home' || !id) 
      ? `https://link.tash.kr/open-app/home` 
      : `https://link.tash.kr/open-app/${mappedType}/${id}?${queryString}`;

    // 2. 스마트 타이머 설정 (1.5초)
    // 앱이 안 열리면 이 타이머가 작동하여 앱스토어로 보냄
    const timer = setTimeout(() => {
      window.location.href = universalLinkUrl;
    }, 1500);

    // 3. 가시성 감시 (Visibility API)
    // 앱이 성공적으로 열리면 브라우저가 hidden 상태가 됨 -> 타이머 취소
    const visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(timer);
        if (onClose) onClose();
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);

    // 4. 앱 깨우기 시도
    window.location.href = customSchemeUrl;

    // (안전장치) 5초 뒤에는 리스너 해제
    setTimeout(() => {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }, 5000);
  }, []);

  return { openApp };
}
