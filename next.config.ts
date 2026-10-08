import type { NextConfig } from "next";

const YEAR = 60 * 60 * 24 * 365;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // 뒤로가기·재방문 시 라우터 캐시를 써서 즉시 표시
    // (문서 내용은 관리자 편집 후 이 시간 안에 반영된다)
    staleTimes: { dynamic: 120, static: 300 },
  },
  async headers() {
    return [
      {
        // 폰트는 고정 릴리스라 1년 캐시. 교체할 때는 반드시 파일 경로를 바꿔야 한다.
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: `public, max-age=${YEAR}, immutable` }],
      },
      {
        // 로그인한 사람만 받는 페이지라 공용 CDN 이 아닌 브라우저에만 캐시한다.
        source: "/tools/:path*",
        headers: [{ key: "Cache-Control", value: "private, max-age=3600" }],
      },
      {
        source: "/enliple-logo.svg",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800" }],
      },
    ];
  },
};

export default nextConfig;
