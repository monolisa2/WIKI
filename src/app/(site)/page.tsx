import { createClient } from "@/lib/supabase/server";
import { PortalHome, type PortalDoc } from "@/components/home/PortalHome";
import type { Category } from "@/lib/types";

/**
 * 임직원 화면 `/` (명세 3-1): 통합 검색 + 분류별 문서 인덱스 (포털형)
 */
export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: catData }, { data: attData }, { data: docData }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    // RLS 로 공개 문서의 첨부만 보인다. 홈에서 📎 표시용
    supabase.from("document_attachments").select("document_id"),
    supabase
      .from("documents")
      .select("id, slug, title, summary, doc_type, icon, revised_date, is_pinned, category_id")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("sort_order")
      .order("title"),
  ]);

  const attached = Array.from(new Set(((attData ?? []) as { document_id: string }[]).map((a) => a.document_id)));
  return <PortalHome categories={(catData ?? []) as Category[]} docs={(docData ?? []) as PortalDoc[]} attached={attached} />;
}
