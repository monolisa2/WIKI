import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";
import { SearchProvider, type SearchSuggestion } from "@/components/search/SearchCommand";
import type { DocType } from "@/lib/constants";

type SuggestionRow = {
  slug: string;
  title: string;
  summary: string | null;
  doc_type: DocType;
  icon: string | null;
  categories: { name: string } | null;
};

/** 임직원 화면 공통 레이아웃: glass 헤더 + 통합 검색 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: suggestionRows }] = await Promise.all([
    user ? supabase.from("profiles").select("role, name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("documents")
      .select("slug, title, summary, doc_type, icon, categories(name)")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const suggestions: SearchSuggestion[] = ((suggestionRows ?? []) as unknown as SuggestionRow[]).map((r) => ({
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    doc_type: r.doc_type,
    icon: r.icon,
    category_name: r.categories?.name ?? null,
  }));

  return (
    <SearchProvider suggestions={suggestions}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader userLabel={profile?.name ?? user?.email ?? ""} isAdmin={profile?.role === "admin"} />
        <div className="flex-1">{children}</div>
        <footer className="hairline-t">
          <div className="wrap flex flex-wrap items-center justify-between gap-2 py-6 text-[12px] text-ink-3">
            <span>인라이플 위키 · 인사관리실</span>
            <span>내용이 다를 경우 원문 규정이 우선합니다. 오류·누락은 각 문서 하단에서 제보해주세요.</span>
          </div>
        </footer>
      </div>
    </SearchProvider>
  );
}
