"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * 마우스를 올리거나 손가락을 댄 링크만 미리 받아둔다.
 *
 * 홈에는 문서 링크가 90개 가까이 있어 Next 기본 프리페치(화면에 보이면 전부)는
 * 요청 폭탄이 된다. 그래서 링크마다 prefetch={false} 로 끄고, 여기서 "누를 것 같은"
 * 링크 하나만 받아온다 — 클릭 순간에는 이미 와 있어 즉시 열린다.
 */
const LIMIT = 60;

export function HoverPrefetch() {
  const router = useRouter();

  useEffect(() => {
    const done = new Set<string>();

    const onIntent = (event: Event) => {
      const target = event.target as Element | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      // 같은 사이트 내부 경로만. 해시·외부 링크·다운로드는 제외.
      if (!href || !href.startsWith("/") || href.startsWith("//") || href.startsWith("/api/")) return;
      if (done.has(href) || done.size >= LIMIT) return;

      done.add(href);
      router.prefetch(href);
    };

    document.addEventListener("mouseover", onIntent, { passive: true });
    document.addEventListener("touchstart", onIntent, { passive: true });
    return () => {
      document.removeEventListener("mouseover", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, [router]);

  return null;
}
