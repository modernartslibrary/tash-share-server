import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const isAndroid = /android/.test(userAgent);
  const isIOS = /iphone|ipad|ipod/.test(userAgent);

  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.MAL.tash';
  const appStoreUrl = 'https://apps.apple.com/app/tash/id6755390469';
  const fallbackUrl = 'https://tash.kr/download';

  let redirectUrl = fallbackUrl;
  if (isAndroid) {
    redirectUrl = playStoreUrl;
  } else if (isIOS) {
    redirectUrl = appStoreUrl;
  }

  // ✅ 302 리다이렉트 반환 (즉시 스토어로 이동)
  return NextResponse.redirect(redirectUrl, 302);
}
