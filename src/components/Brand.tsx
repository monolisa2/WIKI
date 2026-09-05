import Link from "next/link";

export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
      <span className="inline-block h-3 w-3 rotate-45 rounded-[3px] bg-accent-strong" aria-hidden />
      인라이플 위키
    </Link>
  );
}
