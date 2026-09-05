import { createClient } from "@/lib/supabase/server";
import { SearchTrigger } from "@/components/search/SearchCommand";
import { CategoryRail } from "@/components/CategoryRail";
import { DocRow, type DocRowData } from "@/components/DocRow";
import type { Category } from "@/lib/types";

type Row = DocRowData & { category_id: number };

/**
 * 임직원 화면 `/` (명세 3-1)
 * 상단: 통합 검색 · 좌측: 분류 레일 · 본문: 분류별 문서 목록
 */
export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: catData }, { data: docData }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("documents")
      .select("id, slug, title, summary, doc_type, scope, source_system, source_url, revised_date, is_pinned, owner_team, category_id")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("sort_order")
      .order("title"),
  ]);

  const categories = (catData ?? []) as Category[];
  const docs = (docData ?? []) as Row[];
  const byCategory = new Map<number, Row[]>();
  for (const d of docs) {
    const list = byCategory.get(d.category_id) ?? [];
    list.push(d);
    byCategory.set(d.category_id, list);
  }

  const rail = categories.map((c) => ({ slug: c.slug, name: c.name, count: byCategory.get(c.id)?.length ?? 0 }));

  return (
    <>
      {/* 히어로 + 검색 */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(60%_70%_at_50%_0%,rgba(95,163,46,0.12),transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-16 text-center sm:px-8 sm:pb-16 sm:pt-24">
          <h1 className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[56px]">무엇을 찾으세요?</h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] text-ink-2 sm:text-[19px]">
            흩어진 규정과 안내 문서가 어디에 있고, 최신인지 한 곳에서 확인합니다.
          </p>
          <div className="mt-8">
            <SearchTrigger variant="hero" />
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <a key={c.id} href={`#cat-${c.slug}`} className="btn-secondary h-8 px-3.5 text-[13px]">
                {c.name}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 분류별 목록 */}
      <section className="mx-auto grid max-w-6xl items-start gap-10 px-5 pb-24 sm:px-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <CategoryRail categories={rail} />

        <div className="space-y-12">
          {categories.map((c) => {
            const list = byCategory.get(c.id) ?? [];
            return (
              <section key={c.id} id={`cat-${c.slug}`} className="scroll-mt-24">
                <header className="mb-3 flex items-end justify-between gap-4 px-1">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-tight">{c.name}</h2>
                    {c.hint ? <p className="mt-0.5 text-[13px] text-ink-2">{c.hint}</p> : null}
                  </div>
                  <span className="text-[13px] tabular-nums text-ink-3">{list.length}건</span>
                </header>
                <div className="card overflow-hidden">
                  {list.length ? (
                    <ul className="divide-y divide-hairline">
                      {list.map((d) => (
                        <DocRow key={d.id} doc={d} />
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 py-8 text-center text-[14px] text-ink-3">아직 등록된 문서가 없습니다.</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </>
  );
}
