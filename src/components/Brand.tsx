import Link from "next/link";

export function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-black tracking-[0.14em] text-sm text-brand-deep">
      <span className="inline-block w-3.5 h-3.5 bg-brand rotate-45 rounded-[3px]" aria-hidden />
      ENLIPLE WIKI
    </Link>
  );
}
