import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES, SCOPES, SOURCE_SYSTEMS, STATUSES, isKey, type Scope, type Status } from "@/lib/constants";
import { formatDate, isStale } from "@/lib/format";
import type { Category, Document } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

type Row = Pick<
  Document,
  "id" | "slug" | "title" | "doc_type" | "scope" | "status" | "revised_date" | "source_system" | "updated_at" | "is_pinned" | "sort_order" | "owner_team"
> & { categories: { name: string; slug: string } | null };

type Params = {
  category?: string;
  status?: string;
  scope?: string;
  source?: string;
  revised?: string;
  q?: string;
  sort?: string;
  deleted?: string;
};

const SORTS: Record<string, { label: string; column: string; ascending: boolean; nullsFirst?: boolean }> = {
  updated: { label: "최근 수정", column: "updated_at", ascending: false },
  title: { label: "제목", column: "title", ascending: true },
  revised: { label: "개정일 오래된 순", column: "revised_date", ascending: true, nullsFirst: true },
  order: { label: "정렬 순서", column: "sort_order", ascending: true },
};

/** 문서 목록: 분류·상태·적용범위 필터, 정렬 (명세 3-2) */
export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const supabase = await createClient();

  const { data: catData } = await supabase.from("categories").select("*").order("sort_order");
  const categories = (catData ?? []) as Category[];
  const selectedCategory = categories.find((c) => c.slug === p.category);
  const sort = SORTS[p.sort ?? ""] ?? SORTS.updated;

  let query = supabase
    .from("documents")
    .select("id, slug, title, doc_type, scope, status, revised_date, source_system, updated_at, is_pinned, sort_order, owner_team, categories(name, slug)");

  if (selectedCategory) query = query.eq("category_id", selectedCategory.id);
  if (isKey(STATUSES, p.status)) query = query.eq("status", p.status);
  if (isKey(SCOPES, p.scope)) query = query.contains("scope", [p.scope]);
  if (isKey(SOURCE_SYSTEMS, p.source)) query = query.eq("source_system", p.source);
  if (p.revised === "none") query = query.is("revised_date", null);
  if (p.q) query = query.textSearch("search_vector", p.q, { type: "websearch", config: "simple" });

  query = query.order(sort.column, { ascending: sort.ascending, nullsFirst: sort.nullsFirst }).order("title");

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];

  const filterHref = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    const merged = { ...p, ...patch, deleted: undefined };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return `/admin/docs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">문서</h1>
          <p className="mt-1 text-sm text-ink-2">{rows.length}건</p>
        </div>
        <Link href={`/admin/docs/new${selectedCategory ? `?category=${selectedCategory.slug}` : ""}`} className="btn-primary">
          + 새 문서
        </Link>
      </div>

      {p.deleted ? <p className="mt-4 text-sm text-accent">문서를 삭제했습니다.</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">목록을 불러오지 못했습니다. ({error.message})</p> : null}

      <form method="get" className="card mt-6 p-4 grid gap-3 sm:grid-cols-[1fr_10rem_9rem_9rem_9rem_auto] items-end">
        <div>
          <label className="label">검색</label>
          <input name="q" defaultValue={p.q ?? ""} className="input" placeholder="제목·요약·본문" />
        </div>
        <div>
          <label className="label">분류</label>
          <select name="category" defaultValue={p.category ?? ""} className="input">
            <option value="">전체</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">상태</label>
          <select name="status" defaultValue={p.status ?? ""} className="input">
            <option value="">전체</option>
            {(Object.keys(STATUSES) as Status[]).map((s) => (
              <option key={s} value={s}>
                {STATUSES[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">적용 범위</label>
          <select name="scope" defaultValue={p.scope ?? ""} className="input">
            <option value="">전체</option>
            {(Object.keys(SCOPES) as Scope[]).map((s) => (
              <option key={s} value={s}>
                {SCOPES[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">정렬</label>
          <select name="sort" defaultValue={p.sort ?? "updated"} className="input">
            {Object.entries(SORTS).map(([k, s]) => (
              <option key={k} value={k}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-secondary">
            적용
          </button>
          <Link href="/admin/docs" className="btn-ghost">
            초기화
          </Link>
        </div>
        {p.source || p.revised ? (
          <p className="sm:col-span-6 text-xs text-ink-2">
            추가 필터:
            {p.source ? ` 원본 시스템 = ${SOURCE_SYSTEMS[p.source as keyof typeof SOURCE_SYSTEMS] ?? p.source}` : ""}
            {p.revised === "none" ? " 개정일 없음" : ""}
            <Link href={filterHref({ source: undefined, revised: undefined })} className="ml-2 underline">
              해제
            </Link>
          </p>
        ) : null}
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>제목</th>
              <th>분류</th>
              <th>유형</th>
              <th>적용범위</th>
              <th>원본</th>
              <th>최종개정일</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-ink-2 py-10">
                  조건에 맞는 문서가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="hover:bg-black/[0.03]">
                  <td>
                    <Link href={`/admin/docs/${d.id}`} className="font-semibold hover:text-accent">
                      {d.is_pinned ? <span className="text-accent mr-1">★</span> : null}
                      {d.title}
                    </Link>
                    <div className="text-[11px] text-ink-2 font-mono">{d.slug}</div>
                  </td>
                  <td className="text-ink-2 whitespace-nowrap">{d.categories?.name}</td>
                  <td className="whitespace-nowrap">{DOC_TYPES[d.doc_type] ?? d.doc_type}</td>
                  <td className="text-ink-2 whitespace-nowrap">{d.scope.map((s) => SCOPES[s] ?? s).join(", ")}</td>
                  <td className="text-ink-2 whitespace-nowrap">
                    {d.source_system ? SOURCE_SYSTEMS[d.source_system] ?? d.source_system : "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    {d.revised_date ? (
                      <span className={isStale(d.revised_date) ? "text-danger font-semibold" : ""}>{formatDate(d.revised_date)}</span>
                    ) : (
                      <span className="badge bg-warn-soft text-warn">내용 수집 필요</span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
