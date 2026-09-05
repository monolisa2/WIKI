"use client";

import { useEffect, useState } from "react";

export type RailCategory = { slug: string; name: string; count: number };

/** 좌측 분류 레일 (스크롤 위치에 따라 현재 분류 강조) */
export function CategoryRail({ categories }: { categories: RailCategory[] }) {
  const [active, setActive] = useState<string | null>(categories[0]?.slug ?? null);

  useEffect(() => {
    const sections = categories
      .map((c) => document.getElementById(`cat-${c.slug}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace(/^cat-/, ""));
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  return (
    <nav aria-label="분류" className="hidden lg:block sticky top-20 self-start">
      <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">분류</p>
      <ul className="space-y-0.5">
        {categories.map((c) => {
          const isActive = active === c.slug;
          return (
            <li key={c.slug}>
              <a
                href={`#cat-${c.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={`flex items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-[15px] transition-colors ${
                  isActive ? "bg-accent-soft font-medium text-accent" : "text-ink-2 hover:bg-black/[0.04] hover:text-ink"
                }`}
              >
                <span className="truncate">{c.name}</span>
                <span className={`text-[12px] tabular-nums ${isActive ? "text-accent/80" : "text-ink-3"}`}>{c.count}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
