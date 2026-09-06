import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

type RecentRow = {
  id: string;
  title: string;
  status: keyof typeof STATUSES;
  updated_at: string;
  categories: { name: string } | null;
};

/** 대시보드: 공개 중 / 작성 중 / 1년 이상 미개정 / 원본 출처 미확인 (+ 내용 수집 필요) */
export default async function AdminDashboard() {
  const supabase = await createClient();

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const staleBefore = oneYearAgo.toISOString().slice(0, 10);

  const count = (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) =>
    build(base()).then((r) => r.count ?? 0);
  const base = () => supabase.from("documents").select("id", { count: "exact", head: true });

  const [published, draft, stale, unknownSource, needsContent, recent] = await Promise.all([
    count((q) => q.eq("status", "published")),
    count((q) => q.eq("status", "draft")),
    count((q) => q.neq("status", "archived").lt("revised_date", staleBefore)),
    count((q) => q.neq("status", "archived").eq("source_system", "unknown")),
    count((q) => q.neq("status", "archived").is("revised_date", null)),
    supabase
      .from("documents")
      .select("id, title, status, updated_at, categories(name)")
      .order("updated_at", { ascending: false })
      .limit(8)
      .then((r) => (r.data ?? []) as unknown as RecentRow[]),
  ]);

  const tiles = [
    { label: "공개 중", value: published, href: "/admin/docs?status=published" },
    { label: "작성 중", value: draft, href: "/admin/docs?status=draft" },
    { label: "1년 이상 미개정", value: stale, href: "/admin/docs?sort=revised" },
    { label: "원본 출처 미확인", value: unknownSource, href: "/admin/docs?source=unknown" },
    { label: "내용 수집 필요", value: needsContent, href: "/admin/docs?revised=none" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold tracking-tight">대시보드</h1>
        <Link href="/admin/docs/new" className="btn-primary">
          + 새 문서
        </Link>
      </div>

      <ul className="mt-6 grid gap-3 grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="card block p-4 hover:border-hairline-strong transition-colors">
              <p className="text-xs font-semibold text-ink-2">{t.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{t.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-ink-2 tracking-wide">최근 수정</h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>제목</th>
                <th>분류</th>
                <th>상태</th>
                <th>수정일시</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-ink-2 py-8">
                    아직 문서가 없습니다.
                  </td>
                </tr>
              ) : (
                recent.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/admin/docs/${d.id}`} className="font-semibold hover:text-accent">
                        {d.title}
                      </Link>
                    </td>
                    <td className="text-ink-2">{d.categories?.name}</td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="text-ink-2 whitespace-nowrap">{formatDateTime(d.updated_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
