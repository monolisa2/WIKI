import type { Metadata } from "next";
import { suite } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "인라이플 위키", template: "%s · 인라이플 위키" },
  description: "인라이플 그룹 규정·안내 문서 인덱스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={suite.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
