import { createClient } from "@/lib/supabase/server";
import { PortalHome, type PortalDoc } from "@/components/home/PortalHome";
import type { Category } from "@/lib/types";

/**
 * 임직원 화면 `/` (명세 3-1): 통합 검색 + 분류별 문서 인덱스 (포털형)
 */
export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: catData }, { data: docData }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase
      .from("documents")
      .select("id, slug, title, summary, doc_type, icon, revised_date, is_pinned, category_id")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("sort_order")
      .order("title"),
  ]);

  return <PortalHome categories={(catData ?? []) as Category[]} docs={(docData ?? []) as PortalDoc[]} />;
}
