import Link from "next/link";
import { Logo } from "@/components/Logo";

/** 상단 바 브랜드: 인라이플 로고 + "위키" 표기 */
export function BrandMark({ href = "/", label = "위키" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-2.5 text-ink" aria-label={`인라이플 ${label} 홈`}>
      <Logo className="h-[18px] w-auto" />
      <span aria-hidden className="h-4 w-px bg-hairline-strong" />
      <span className="text-[14px] font-semibold tracking-tight text-ink-2">{label}</span>
    </Link>
  );
}
