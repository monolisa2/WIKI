"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SearchTrigger } from "./SearchCommand";

/**
 * 헤더 검색 트리거.
 * 페이지에 히어로 검색(#hero-search)이 있으면 그것이 화면에서 사라진 뒤에만 나타나고,
 * 없는 페이지(문서 상세 등)에서는 항상 보인다. 첫 화면에 검색창이 두 개 보이는 중복을 피한다.
 */
export function HeaderSearch() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-search");
    if (!hero) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "-56px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div
      aria-hidden={!visible}
      className={`transition-[opacity,transform] duration-200 ease-out ${
        visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
      }`}
    >
      <SearchTrigger />
    </div>
  );
}
