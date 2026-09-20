import type { Metadata } from "next";
// Pretendard Variable (OFL, public/fonts/pretendard/). 다이내믹 서브셋: 화면에 쓰인 글자 조각만 받는다.
import "./pretendard.css";
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
