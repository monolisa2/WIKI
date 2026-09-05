import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** 통합 검색 API. 로그인 사용자 세션으로 실행되므로 RLS 가 그대로 적용된다. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("q") ?? "";
  const q = raw.replace(/\s+/g, " ").trim().slice(0, 100);

  if (!q) {
    return NextResponse.json({ query: q, documents: [], categories: [] }, { headers: NO_STORE });
  }

  const supabase = await createClient();
  // PostgREST or() 필터 구분자와 ilike 와일드카드는 공백으로 치환
  const safe = q.replace(/[,()%_\\]/g, " ").replace(/\s+/g, " ").trim();

  const [docs, cats] = await Promise.all([
    supabase.rpc("search_documents", { p_query: q, p_limit: 20 }),
    safe
      ? supabase.from("categories").select("slug, name, hint").or(`name.ilike.%${safe}%,hint.ilike.%${safe}%`).order("sort_order").limit(4)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (docs.error) {
    return NextResponse.json(
      { query: q, documents: [], categories: [], error: docs.error.message },
      { status: 500, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { query: q, documents: docs.data ?? [], categories: cats.error ? [] : cats.data ?? [] },
    { headers: NO_STORE },
  );
}
