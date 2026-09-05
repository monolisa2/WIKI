import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/Brand";
import type { Category } from "@/lib/types";

/**
 * 임직원 화면 `/`
 * 검색·분류별 목록·문서 상세는 개발 순서 4단계에서 구현. 지금은 로그인 확인용 최소 화면.
 */
export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: categories }, { data: published }] = await Promise.all([
    user ? supabase.from("profiles").select("role, name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("categories").select("id, slug, name, hint, sort_order").order("sort_order"),
    supabase.from("documents").select("category_id").eq("status", "published"),
  ]);

  const counts = new Map<number, number>();
  for (const row of (published ?? []) as { category_id: number }[]) {
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-brand-line bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-3 text-sm text-ink-soft">
            <span>{profile?.name ?? user?.email}</span>
            {profile?.role === "admin" ? (
              <Link href="/admin" className="btn-secondary">
                관리자
              </Link>
            ) : null}
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-black tracking-tight">인라이플 위키</h1>
        <p className="mt-2 text-ink-soft">
          흩어진 규정·안내 문서가 <strong className="text-ink">어디에 있고, 최신인지</strong>를 한 곳에서 확인합니다.
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          검색과 분류별 문서 목록, 문서 상세 화면은 다음 단계에서 열립니다.
        </p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {((categories ?? []) as Category[]).map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold">{c.name}</span>
                <span className="text-xs text-ink-soft">{counts.get(c.id) ?? 0}건</span>
              </div>
              <p className="mt-1 text-xs text-ink-soft leading-relaxed">{c.hint}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
