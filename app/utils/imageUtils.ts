/**
 * TMDB나 Spotify 등 다양한 출처의 이미지 URL을 처리하는 유틸리티
 */
export function resolveImageUrl(url: string | null | undefined): string {
  const normalizedUrl = url?.trim();
  if (!normalizedUrl) return '';
  
  // 이미 전체 경로(http)인 경우 그대로 반환
  if (normalizedUrl.startsWith('http')) return normalizedUrl;

  // 로컬 아이콘 경로는 그대로 사용
  if (normalizedUrl.startsWith('/icons/')) return normalizedUrl;
  
  // TMDB 상대 경로 처리 (/... 형태)
  if (normalizedUrl.startsWith('/')) {
    // 앨범이나 트랙 이미지인데 /로 시작하는 경우는 거의 없지만, 혹시 모르니 체크
    return `https://image.tmdb.org/t/p/w500${normalizedUrl}`;
  }
  
  return normalizedUrl;
}

/**
 * 인물 프로필 이미지용 (TMDB)
 */
export function resolveProfileImageUrl(path: string | null | undefined): string {
  const normalizedPath = path?.trim();
  if (!normalizedPath) return '';
  if (normalizedPath.startsWith('http')) return normalizedPath;
  if (normalizedPath.startsWith('/icons/')) return normalizedPath;
  if (normalizedPath.startsWith('/')) {
    return `https://image.tmdb.org/t/p/w200${normalizedPath}`;
  }
  return normalizedPath;
}
