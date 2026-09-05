import Link from "next/link";
import { SearchTrigger } from "@/components/search/SearchCommand";
import { ConfidentialNotice } from "@/components/ConfidentialNotice";
import { DEFAULT_CATEGORY_ICON, docIcon, type DocType } from "@/lib/constants";
import type { Category } from "@/lib/types";

export type PortalDoc = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  doc_type: DocType;
  icon: string | null;
  revised_date: string | null;
  is_pinned: boolean | null;
  category_id: number;
};

/**
 * 홈 = 포털형 인덱스 (참고: 이전 사내 위키의 노션 홈).
 * 분류별로 "이모지 + 제목" 한 줄 링크를 촘촘히 깔아 한 화면에서 전체 문서를 훑을 수 있게 한다.
 * 데이터를 받지 않는 표현 컴포넌트라 미리보기·테스트에서 그대로 쓸 수 있다.
 */
export function PortalHome({ categories, docs }: { categories: Category[]; docs: PortalDoc[] }) {
  const byCategory = new Map<number, PortalDoc[]>();
  for (const d of docs) {
    const list = byCategory.get(d.category_id) ?? [];
    list.push(d);
    byCategory.set(d.category_id, list);
  }
  const pending = docs.filter((d) => !d.revised_date).length;

  return (
    <>
      {/* 인트로 + 검색 */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(55%_65%_at_50%_0%,rgba(122,193,67,0.20),transparent_70%)]"
        />
        <div className="wrap relative pb-4 pt-14 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-accent">Enliple Wiki</p>
            <h1 className="mt-3 text-[38px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[52px]">인라이플 생활 안내</h1>
            <div id="hero-search" className="mt-8">
              <SearchTrigger variant="hero" />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5">
            <blockquote className="border-l-[3px] border-hairline-strong pl-5 text-[15px] leading-[1.9] text-ink-2 sm:text-[16px]">
              안녕하세요. 인라이플과 계열사 구성원을 위한 규정·제도·생활 안내서입니다.
              <br />
              지내시면서 궁금한 점이 생기면 검색하거나 아래 분류를 둘러봐 주세요. 내용은 인사관리실이 계속 채워갑니다.
            </blockquote>
            <ConfidentialNotice />
          </div>
        </div>
      </section>

      {/* 분류별 링크 그리드 */}
      <section className="wrap grid gap-x-12 gap-y-12 pb-16 pt-10 md:grid-cols-2 xl:grid-cols-3" aria-label="분류별 문서">
        {categories.map((c) => {
          const list = byCategory.get(c.id) ?? [];
          return (
            <section key={c.id} id={`cat-${c.slug}`} className="min-w-0 scroll-mt-24">
              <h2 className="flex items-center gap-2.5 border-b border-hairline pb-2.5 text-[20px] font-semibold tracking-tight">
                <span aria-hidden className="text-[22px] leading-none">
                  {c.icon?.trim() || DEFAULT_CATEGORY_ICON}
                </span>
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-[13px] font-normal tabular-nums text-ink-3">{list.length}</span>
              </h2>
              {list.length ? (
                <ul className="mt-2.5 space-y-px">
                  {list.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/docs/${d.slug}`}
                        title={d.summary ?? undefined}
                        className="group flex items-center gap-2.5 rounded-[10px] px-2 py-[7px] transition-colors hover:bg-accent-soft"
                      >
                        <span aria-hidden className="w-6 shrink-0 text-center text-[17px] leading-none">
                          {docIcon(d.icon, d.doc_type)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[15.5px] font-medium text-ink underline decoration-hairline-strong decoration-[1.5px] underline-offset-[5px] transition-colors group-hover:text-accent group-hover:decoration-accent">
                          {d.title}
                        </span>
                        {d.is_pinned ? (
                          <span aria-label="고정" className="shrink-0 text-[11px] font-semibold text-accent">
                            필독
                          </span>
                        ) : null}
                        {!d.revised_date ? (
                          <span aria-label="내용 수집 필요" title="내용 수집 필요" className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 px-2 text-[14px] text-ink-3">준비 중입니다.</p>
              )}
              {c.hint ? <p className="mt-3 px-2 text-[12.5px] leading-relaxed text-ink-3">{c.hint}</p> : null}
            </section>
          );
        })}
      </section>

      {/* 안내 */}
      <section className="wrap pb-24">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <aside className="callout callout-note my-0!" data-emoji="🔎" role="note">
            <p>
              <strong>찾는 내용이 없나요?</strong> 위 검색창에서 규정·안내·양식을 한 번에 찾을 수 있어요. 키보드에서 <kbd className="kbd">Ctrl</kbd>{" "}
              <kbd className="kbd">K</kbd> 를 눌러도 열립니다.
            </p>
          </aside>
          <aside className="callout callout-plain my-0!" data-emoji="🟠" role="note">
            <p>
              제목 옆 <span aria-hidden className="mx-0.5 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" /> 표시는 아직 <strong>내용을 수집 중</strong>인
              문서입니다{pending ? ` (${pending}건)` : ""}. 제목과 위치만 먼저 등록했고, 문서 아래 제보 칸으로 알려주시면 빨리 채웁니다.
            </p>
          </aside>
        </div>
      </section>
    </>
  );
}
