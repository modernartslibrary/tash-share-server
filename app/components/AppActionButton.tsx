'use client';

export default function AppActionButton({ type, id }: { type: string, id: string }) {
  const handleOpenApp = () => {
    // GoRouter는 브라우저 URL의 Path 부분을 기준으로 매칭하므로, 
    // HTTPS 주소를 사용하는 것이 가장 안정적으로 이동합니다.
    const mappedType = type === 'user' ? 'profile' : type;
    const deepLink = `https://link.tash.kr/${mappedType}/${id}`;

    // 플랫폼별 스토어 주소 (TASH 앱 정보)
    const playStoreUrl = `https://play.google.com/store/apps/details?id=com.MAL.tash`;
    const appStoreUrl = `https://apps.apple.com/app/tash/id6755390469`;

    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isAndroid = /android/.test(userAgent);
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    // 1. 앱 열기 시도
    window.location.href = deepLink;

    // 2. 앱이 없을 경우 스토어로 이동 (타이머 기반)
    const start = Date.now();
    setTimeout(() => {
      // 2.5초 이내에 화면이 백그라운드로 가지 않았다면 (앱이 안 열렸다면) 스토어로 이동
      if (Date.now() - start < 3000) {
        if (isAndroid) {
          window.location.href = playStoreUrl;
        } else if (isIOS) {
          window.location.href = appStoreUrl;
        } else {
          // PC 등 기타 환경은 웹 공식 사이트 등으로 유도 가능
          window.location.href = 'https://tash.kr';
        }
      }
    }, 2500);
  };

  return (
    <div className="fixed bottom-10 left-0 right-0 p-5 flex justify-center z-50 pointer-events-none">
      <button
        onClick={handleOpenApp}
        className="w-full max-w-[420px] bg-black text-white h-[64px] rounded-full text-[17px] font-black shadow-2xl active:scale-95 transition-all pointer-events-auto"
      >
        앱에서 열기
      </button>
    </div>
  );
}
