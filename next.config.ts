import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 뒤로가기·재방문 시 30초 동안은 라우터 캐시를 써서 즉시 표시 (문서 내용은 관리자 편집 후 30초 내 반영)
  experimental: { staleTimes: { dynamic: 30 } },
};

export default nextConfig;
