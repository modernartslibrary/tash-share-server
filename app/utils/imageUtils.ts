/**
 * TMDB나 Spotify 등 다양한 출처의 이미지 URL을 처리하는 유틸리티
 */
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // 이미 전체 경로(http)인 경우 그대로 반환
  if (url.startsWith('http')) return url;
  
  // TMDB 상대 경로 처리 (/... 형태)
  if (url.startsWith('/')) {
    // 앨범이나 트랙 이미지인데 /로 시작하는 경우는 거의 없지만, 혹시 모르니 체크
    return `https://image.tmdb.org/t/p/w500${url}`;
  }
  
  return url;
}

/**
 * 인물 프로필 이미지용 (TMDB)
 */
export function resolveProfileImageUrl(path: string | null | undefined): string {
  if (!path) return '/icons/default_profile.jpg';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w200${path}`;
  }
  return path;
}
