import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // iOS/Safari 아이콘 자동 요청이 /profile/[username] 같은 동적 라우트로
  // 해석되지 않도록 루트 아이콘 파일로 먼저 돌려보냅니다.
  async redirects() {
    return [
      {
        source: "/:path*/apple-touch-icon.png",
        destination: "/apple-icon.png",
        permanent: true,
      },
      {
        source: "/:path*/apple-touch-icon-precomposed.png",
        destination: "/apple-icon.png",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mosaic.scdn.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.pstatic.net",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: ['172.30.1.33', 'localhost:3000'],
};

export default nextConfig;
