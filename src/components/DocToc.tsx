"use client";

import { useEffect, useRef, useState } from "react";
import type { TocItem } from "@/lib/toc";

/** 문서 우측 고정 목차: 스크롤 위치에 따라 현재 절을 강조하고, 목차 자체도 그 항목이 보이도록 따라간다. */
export function DocToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    // 화면 상단(헤더 아래)을 지난 마지막 제목을 현재 위치로 본다.
    const pick = () => {
      const line = 120;
      let current: HTMLElement | null = null;
      for (const el of headings) {
        if (el.getBoundingClientRect().top - line <= 0) current = el;
        else break;
      }
      setActive((current ?? headings[0]).id);
    };
    pick();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(pick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items]);

  useEffect(() => {
    if (!active || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-id="${CSS.escape(active)}"]`);
    if (!el) return;
    const box = listRef.current;
    const top = el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2;
    box.scrollTo({ top, behavior: "smooth" });
  }, [active]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="목차" className="text-[13px]">
      <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-ink-3">목차</p>
      <ol ref={listRef} className="max-h-[calc(100vh-9rem)] space-y-px overflow-y-auto pr-1 [scrollbar-width:thin]">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id} data-id={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`block rounded-[8px] py-1.5 pr-2 leading-snug transition-colors ${item.depth === 3 ? "pl-6 text-[12.5px]" : "pl-3 font-medium"} ${
                  isActive ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-black/[0.04] hover:text-ink"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
