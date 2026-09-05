"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DOC_TYPES, type DocType } from "@/lib/constants";

/* ────────────────────────────────────────────────────────────────
   통합 검색 (Spotlight 방식)
   - 상단 헤더의 검색 필드 / 홈 히어로 검색 필드 / ⌘K · Ctrl+K · "/" 로 열림
   - 입력 즉시 /api/search 호출, 문서 + 분류 결과를 한 패널에 표시
   - ↑↓ 이동, ↵ 열기, esc 닫기
   ──────────────────────────────────────────────────────────────── */

export type SearchSuggestion = {
  slug: string;
  title: string;
  summary: string | null;
  doc_type: DocType;
  category_name: string | null;
};

export type SearchHit = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  doc_type: DocType;
  scope: string[];
  revised_date: string | null;
  source_system: string | null;
  source_url: string | null;
  is_pinned: boolean;
  category_slug: string;
  category_name: string;
  score: number;
  headline: string | null;
};

export type SearchResponse = {
  query: string;
  documents: SearchHit[];
  categories: { slug: string; name: string; hint: string | null }[];
  error?: string;
};

type Item = {
  key: string;
  kind: "doc" | "category";
  href: string;
  title: string;
  subtitle: string | null;
  meta: string | null;
  docType?: DocType;
};

type SearchContextValue = { open: (initialQuery?: string) => void; isMac: boolean };
const SearchContext = createContext<SearchContextValue | null>(null);

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function SearchProvider({ suggestions, children }: { suggestions: SearchSuggestion[]; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform) || /Mac OS X/i.test(navigator.userAgent));
  }, []);

  const open = useCallback((q = "") => {
    setInitialQuery(q);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }
      if (e.key === "/" && !isOpen && !isEditableTarget(e.target)) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, open]);

  const value = useMemo(() => ({ open, isMac }), [open, isMac]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {isOpen ? <SearchDialog initialQuery={initialQuery} suggestions={suggestions} onClose={close} /> : null}
    </SearchContext.Provider>
  );
}

function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("SearchTrigger 는 SearchProvider 안에서 사용해야 합니다.");
  return ctx;
}

/** 검색을 여는 트리거. compact = 헤더용 필드, hero = 홈 상단 큰 필드 */
export function SearchTrigger({ variant = "compact", className = "" }: { variant?: "compact" | "hero"; className?: string }) {
  const { open, isMac } = useSearch();
  const shortcut = isMac ? "⌘K" : "Ctrl K";

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={() => open()}
        aria-label="검색 열기"
        className={`group glass-strong mx-auto flex w-full max-w-2xl items-center gap-4 rounded-[22px] border border-white/70 px-6 text-left shadow-lift outline-none transition-[box-shadow,transform,border-color] duration-300 hover:border-accent-line hover:shadow-float hover:-translate-y-px focus-visible:ring-4 focus-visible:ring-accent-strong/20 h-[60px] sm:h-16 ${className}`}
      >
        <SearchIcon className="h-6 w-6 shrink-0 text-ink-3 transition-colors group-hover:text-accent" />
        <span className="flex-1 truncate text-[17px] sm:text-[18px] text-ink-3">규정, 안내, 양식… 무엇이든 검색</span>
        <kbd className="kbd hidden sm:inline-flex">{shortcut}</kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => open()}
      aria-label="검색 열기"
      className={`flex h-9 items-center gap-2 rounded-full bg-black/[0.05] pl-3 pr-2 text-[13px] text-ink-2 outline-none transition-colors hover:bg-black/[0.08] focus-visible:ring-4 focus-visible:ring-accent-strong/20 ${className}`}
    >
      <SearchIcon className="h-4 w-4 shrink-0" />
      <span className="hidden min-w-[140px] text-left sm:inline">검색</span>
      <kbd className="kbd hidden sm:inline-flex">{shortcut}</kbd>
    </button>
  );
}

function SearchDialog({
  initialQuery,
  suggestions,
  onClose,
}: {
  initialQuery: string;
  suggestions: SearchSuggestion[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 포커스 + 배경 스크롤 잠금
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const term = query.trim();

  // 디바운스 검색 (이전 요청은 abort)
  useEffect(() => {
    if (!term) {
      setResult(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as SearchResponse;
        if (controller.signal.aborted) return;
        setResult(data);
        setActive(0);
        setLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResult({ query: term, documents: [], categories: [], error: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
        setLoading(false);
      }
    }, 140);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const { catItems, docItems } = useMemo(() => {
    if (!term) {
      return {
        catItems: [] as Item[],
        docItems: suggestions.map<Item>((s) => ({
          key: `s-${s.slug}`,
          kind: "doc",
          href: `/docs/${s.slug}`,
          title: s.title,
          subtitle: s.summary,
          meta: s.category_name,
          docType: s.doc_type,
        })),
      };
    }
    if (!result) return { catItems: [] as Item[], docItems: [] as Item[] };
    return {
      catItems: result.categories.map<Item>((c) => ({
        key: `c-${c.slug}`,
        kind: "category",
        href: `/#cat-${c.slug}`,
        title: c.name,
        subtitle: c.hint,
        meta: "분류",
      })),
      docItems: result.documents.map<Item>((d) => ({
        key: `d-${d.id}`,
        kind: "doc",
        href: `/docs/${d.slug}`,
        title: d.title,
        subtitle: d.headline || d.summary,
        meta: d.category_name,
        docType: d.doc_type,
      })),
    };
  }, [term, result, suggestions]);

  const items = useMemo(() => [...catItems, ...docItems], [catItems, docItems]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (items.length ? (i + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      const it = items[active];
      if (it) {
        e.preventDefault();
        go(it.href);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const showEmpty = Boolean(term) && Boolean(result) && !loading && !result?.error && items.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
      <div className="animate-fade absolute inset-0 bg-black/25 backdrop-blur-[2px]" aria-hidden onMouseDown={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="통합 검색"
        onKeyDown={onKeyDown}
        className="animate-pop glass-strong relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/70 shadow-float"
      >
        <div className="hairline-b flex h-[64px] items-center gap-3 px-5">
          <SearchIcon className="h-5 w-5 shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="규정, 안내, 양식… 무엇이든 검색"
            className="flex-1 bg-transparent text-[19px] text-ink outline-none placeholder:text-ink-3"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="검색어"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={items[active] ? `search-item-${active}` : undefined}
          />
          {loading ? <Spinner /> : null}
          <button type="button" onClick={onClose} className="kbd cursor-pointer hover:text-ink" aria-label="닫기">
            esc
          </button>
        </div>

        <div ref={listRef} id="search-results" role="listbox" className="max-h-[min(60vh,520px)] overflow-y-auto py-2">
          {result?.error ? <p className="px-5 py-6 text-[14px] text-danger">{result.error}</p> : null}

          {showEmpty ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[15px] font-medium text-ink">
                &ldquo;{term}&rdquo; 에 대한 결과가 없습니다
              </p>
              <p className="mt-1 text-[13px] text-ink-2">다른 단어로 검색해보세요. 예: 연차, 식권, 법인카드, 명함</p>
            </div>
          ) : null}

          {!term && docItems.length ? <GroupLabel>추천 문서</GroupLabel> : null}
          {catItems.length ? <GroupLabel>분류</GroupLabel> : null}
          {catItems.map((it, i) => (
            <ResultRow key={it.key} item={it} index={i} active={active === i} onActivate={setActive} onSelect={go} />
          ))}
          {term && docItems.length ? <GroupLabel>문서 · {docItems.length}</GroupLabel> : null}
          {docItems.map((it, j) => {
            const i = catItems.length + j;
            return <ResultRow key={it.key} item={it} index={i} active={active === i} onActivate={setActive} onSelect={go} />;
          })}
        </div>

        <div className="hairline-t flex h-10 items-center gap-4 px-5 text-[12px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="kbd">↑</kbd>
            <kbd className="kbd">↓</kbd> 이동
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="kbd">↵</kbd> 열기
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="kbd">esc</kbd> 닫기
          </span>
        </div>
      </div>
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">{children}</p>;
}

function ResultRow({
  item,
  index,
  active,
  onActivate,
  onSelect,
}: {
  item: Item;
  index: number;
  active: boolean;
  onActivate: (i: number) => void;
  onSelect: (href: string) => void;
}) {
  const glyph = item.kind === "category" ? "#" : (item.docType && DOC_TYPES[item.docType]?.[0]) || "문";
  return (
    <Link
      id={`search-item-${index}`}
      role="option"
      aria-selected={active}
      data-index={index}
      href={item.href}
      onMouseMove={() => {
        if (!active) onActivate(index);
      }}
      onClick={(e) => {
        e.preventDefault();
        onSelect(item.href);
      }}
      className={`mx-2 flex items-start gap-3 rounded-[14px] px-3 py-2.5 transition-colors ${active ? "bg-accent-strong text-white" : "text-ink hover:bg-accent-soft"}`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[12px] font-semibold ${
          active ? "bg-white/20 text-white" : "bg-accent-soft text-accent"
        }`}
      >
        {glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[16px] font-medium">{item.title}</span>
          {item.meta ? <span className={`shrink-0 text-[12px] ${active ? "text-white/70" : "text-ink-3"}`}>{item.meta}</span> : null}
        </span>
        {item.subtitle ? (
          <span className={`hl mt-0.5 block truncate text-[14px] ${active ? "text-white/80" : "text-ink-2"}`}>
            <Highlight text={item.subtitle} />
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** ts_headline 의 ⟦ ⟧ 마커를 <mark> 로 렌더 (HTML 은 그대로 텍스트로 취급) */
function Highlight({ text }: { text: string }) {
  if (!text.includes("⟦")) return <>{text}</>;
  const parts = text.split(/(⟦[^⟧]*⟧)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("⟦") && p.endsWith("⟧") ? <mark key={i}>{p.slice(1, -1)}</mark> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin text-ink-3" aria-label="검색 중">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
