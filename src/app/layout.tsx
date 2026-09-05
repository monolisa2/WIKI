import type { Metadata } from "next";
// Pretendard Variable 을 npm 패키지에서 직접 번들 (외부 CDN 의존 없음, 동적 서브셋으로 필요한 글리프만 로드)
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "인라이플 위키", template: "%s · 인라이플 위키" },
  description: "인라이플 그룹 규정·안내 문서 인덱스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
