import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "인라이플 위키", template: "%s · 인라이플 위키" },
  description: "인라이플 그룹 규정·안내 문서 인덱스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard Variable · jsdelivr CDN (명세 2번) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
