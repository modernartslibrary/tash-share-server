'use client';

import { useCallback } from 'react';

/**
 * 딥링크 실행 훅
 * open.tash.kr은 link.tash.kr과 다른 도메인이므로
 * Safari 동일 도메인 제약 없이 Universal Link 직접 호출 가능
 */
export function useDeepLink() {
  const openApp = useCallback((args: {
    type: string;
    id: string;
    slug?: string;
    onClose?: () => void;
  }) => {
    const { type, id, slug, onClose } = args;

    const normalizedType = type === 'user' ? 'profile' : type;

    const queryParams = new URLSearchParams();
    if (slug) queryParams.set('slug', slug);
    queryParams.set('from', 'web');
    const queryString = queryParams.toString();

    // Universal Link URL 구성
    const universalLinkUrl =
      normalizedType === 'home' || !id
        ? `https://open.tash.kr/open-app/home`
        : normalizedType === 'profile'
          ? `https://open.tash.kr/open-app/u/${id}?${queryString}`
          : `https://open.tash.kr/open-app/${normalizedType}/${id}?${queryString}`;

    // Universal Link 직접 호출 (커스텀 스킴·타이머·Visibility API 불필요)
    window.location.href = universalLinkUrl;

    if (onClose) onClose();
  }, []);

  return { openApp };
}
