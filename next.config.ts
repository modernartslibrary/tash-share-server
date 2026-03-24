import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  // @ts-ignore
  allowedDevOrigins: ['172.30.1.33', 'localhost:3000'],
};

export default nextConfig;
