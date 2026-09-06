import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ATTACHMENT_BUCKET } from "@/lib/files";

const NO_STORE = { "Cache-Control": "private, no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 첨부 파일 내려받기. 로그인 사용자 세션으로 첨부 행을 조회(RLS: 공개 문서 또는 관리자)한 뒤
 * 2분짜리 서명 URL 로 보낸다. ?view=1 이면 다운로드 대신 브라우저에서 바로 연다(PDF·이미지).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE });

  const supabase = await createClient();
  const { data: att } = await supabase.from("document_attachments").select("storage_path, file_name").eq("id", id).maybeSingle();
  if (!att) return NextResponse.json({ error: "not found" }, { status: 404, headers: NO_STORE });

  const view = request.nextUrl.searchParams.get("view") === "1";
  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(att.storage_path, 120, view ? undefined : { download: att.file_name });
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "signed url failed" }, { status: 500, headers: NO_STORE });
  }
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: NO_STORE });
}
