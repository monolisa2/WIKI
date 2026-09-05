import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";
import { createCategory, updateCategory } from "./actions";

/** 분류 관리: 이름·순서·설명(hint). slug 는 URL 앵커로 쓰이므로 생성 후 변경하지 않는다. */
export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const [{ data: categories }, { data: docs }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("documents").select("category_id"),
  ]);

  const counts = new Map<number, number>();
  for (const row of (docs ?? []) as { category_id: number }[]) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return (
    <div>
      <h1 className="text-xl font-black tracking-tight">분류 관리</h1>
      <p className="mt-1 text-sm text-ink-2">임직원 화면 좌측 레일의 순서와 설명을 관리합니다.</p>

      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      {saved ? <p className="mt-4 text-sm text-accent">저장했습니다.</p> : null}

      <div className="card mt-6 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-24">순서</th>
              <th className="w-32">slug</th>
              <th className="w-48">이름</th>
              <th>설명 (hint)</th>
              <th className="w-16">문서</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {((categories ?? []) as Category[]).map((c) => {
              const formId = `cat-${c.id}`;
              return (
                <tr key={c.id}>
                  <td>
                    <form id={formId} action={updateCategory}>
                      <input type="hidden" name="id" value={c.id} />
                    </form>
                    <input form={formId} name="sort_order" type="number" defaultValue={c.sort_order} className="input w-20" />
                  </td>
                  <td className="font-mono text-xs text-ink-2 pt-3">{c.slug}</td>
                  <td>
                    <input form={formId} name="name" defaultValue={c.name} className="input" required />
                  </td>
                  <td>
                    <input form={formId} name="hint" defaultValue={c.hint ?? ""} className="input" />
                  </td>
                  <td className="text-ink-2 pt-3 tabular-nums">{counts.get(c.id) ?? 0}</td>
                  <td>
                    <button form={formId} type="submit" className="btn-secondary">
                      저장
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="text-sm font-bold">분류 추가</h2>
        <form action={createCategory} className="mt-3 grid gap-3 sm:grid-cols-[6rem_10rem_12rem_1fr_auto] items-end">
          <div>
            <label className="label">순서</label>
            <input name="sort_order" type="number" defaultValue={100} className="input" />
          </div>
          <div>
            <label className="label">slug</label>
            <input name="slug" placeholder="예: safety" className="input" required pattern="[a-z0-9][a-z0-9-]*" />
          </div>
          <div>
            <label className="label">이름</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">설명 (hint)</label>
            <input name="hint" className="input" />
          </div>
          <button type="submit" className="btn-primary">
            추가
          </button>
        </form>
      </section>
    </div>
  );
}
