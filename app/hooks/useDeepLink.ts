'use client';

import { useCallback } from 'react';

const APP_OPEN_BASE_URL = 'https://open.tash.kr/open-app';

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

    const universalLinkUrl =
      normalizedType === 'home' || !id
        ? `${APP_OPEN_BASE_URL}/home`
        : `${APP_OPEN_BASE_URL}/${normalizedType}/${id}?${queryString}`;

    window.location.href = universalLinkUrl;

    if (onClose) onClose();
  }, []);

  return { openApp };
}
