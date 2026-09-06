import localFont from "next/font/local";

/**
 * 본문 글꼴: SUITE (OFL 1.1, src/app/fonts/LICENSE-SUITE.txt).
 * 저장소에 woff2 로 번들해 외부 CDN 의존이 없다. 쓰는 굵기만 넣는다 (400·500·600·700·900).
 */
export const suite = localFont({
  src: [
    { path: "./fonts/SUITE-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/SUITE-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/SUITE-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/SUITE-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/SUITE-Heavy.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-suite",
  display: "swap",
  fallback: ["Apple SD Gothic Neo", "Malgun Gothic", "system-ui", "sans-serif"],
});
