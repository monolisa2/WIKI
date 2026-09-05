"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DOC_TYPES, SCOPES, SOURCE_SYSTEMS, SLUG_PATTERN, isKey, type Scope } from "@/lib/constants";
import type { DocumentInput } from "@/lib/types";

export type DocFormState = { error?: string };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseInput(formData: FormData): DocumentInput {
  const rawScope = formData.getAll("scope").map(String).filter((s): s is Scope => isKey(SCOPES, s));
  const scope: Scope[] = rawScope.length === 0 || rawScope.includes("all") ? ["all"] : rawScope;
  const docType = str(formData, "doc_type");
  const sourceSystem = str(formData, "source_system");

  return {
    category_id: str(formData, "category_id"),
    slug: str(formData, "slug").toLowerCase(),
    title: str(formData, "title"),
    summary: str(formData, "summary"),
    body_md: String(formData.get("body_md") ?? ""),
    doc_type: isKey(DOC_TYPES, docType) ? docType : "guide",
    icon: str(formData, "icon").slice(0, 8),
    scope,
    source_system: isKey(SOURCE_SYSTEMS, sourceSystem) ? sourceSystem : "",
    source_url: str(formData, "source_url"),
    owner_team: str(formData, "owner_team"),
    effective_date: str(formData, "effective_date"),
    revised_date: str(formData, "revised_date"),
    is_pinned: formData.get("is_pinned") === "on",
    sort_order: str(formData, "sort_order"),
  };
}

function validate(v: DocumentInput): string | null {
  if (!v.title) return "제목을 입력해주세요.";
  if (!v.slug) return "slug 를 입력해주세요.";
  if (!SLUG_PATTERN.test(v.slug)) return "slug 는 영문 소문자·숫자·한글·하이픈만 사용할 수 있습니다.";
  if (!/^\d+$/.test(v.category_id)) return "분류를 선택해주세요.";
  if (v.doc_type === "link" && !v.source_url) return "링크 문서는 원문 URL 이 필요합니다.";
  if (v.source_url && !/^https?:\/\//i.test(v.source_url)) return "원문 URL 은 http:// 또는 https:// 로 시작해야 합니다.";
  if (v.sort_order && !/^-?\d+$/.test(v.sort_order)) return "정렬 순서는 정수여야 합니다.";
  return null;
}

function toRow(v: DocumentInput, userId: string) {
  return {
    category_id: Number(v.category_id),
    slug: v.slug,
    title: v.title,
    summary: v.summary || null,
    body_md: v.doc_type === "link" ? null : v.body_md.trim() || null,
    doc_type: v.doc_type,
    icon: v.icon || null,
    scope: v.scope,
    source_system: v.source_system || null,
    source_url: v.source_url || null,
    owner_team: v.owner_team || null,
    effective_date: v.effective_date || null,
    revised_date: v.revised_date || null,
    is_pinned: v.is_pinned,
    sort_order: v.sort_order ? Number(v.sort_order) : 0,
    updated_by: userId,
  };
}

function revalidateDocs(id?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/docs");
  revalidatePath("/");
  if (id) revalidatePath(`/admin/docs/${id}`);
}

/** 문서 생성/수정 (useActionState 용). 성공 시 편집 화면으로 redirect. */
export async function saveDocument(_prev: DocFormState, formData: FormData): Promise<DocFormState> {
  const id = str(formData, "id");
  const values = parseInput(formData);
  const invalid = validate(values);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/docs");

  const row = toRow(values, user.id);
  let docId = id;

  if (id) {
    const { error } = await supabase.from("documents").update(row).eq("id", id);
    if (error) return { error: friendlyDbError(error.code, error.message, values.slug) };
  } else {
    const { data, error } = await supabase
      .from("documents")
      .insert({ ...row, created_by: user.id, status: "draft" })
      .select("id")
      .single();
    if (error) return { error: friendlyDbError(error.code, error.message, values.slug) };
    docId = (data as { id: string }).id;
  }

  revalidateDocs(docId);
  redirect(`/admin/docs/${docId}?saved=1`);
}

function friendlyDbError(code: string | undefined, message: string, slug: string) {
  if (code === "23505") return `이미 사용 중인 slug 입니다: ${slug}`;
  if (code === "42501") return "권한이 없습니다. 관리자 계정인지 확인해주세요.";
  return `저장에 실패했습니다. (${message})`;
}

function backToDoc(id: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(`/admin/docs/${id}${qs ? `?${qs}` : ""}`);
}

/** publish: DB 함수가 status 변경 + revision 스냅샷을 한 트랜잭션으로 처리 */
export async function publishDocument(formData: FormData) {
  const id = str(formData, "id");
  const changeNote = str(formData, "change_note");
  if (!id) redirect("/admin/docs");

  const supabase = await createClient();
  const { data: version, error } = await supabase.rpc("publish_document", {
    p_document_id: id,
    p_change_note: changeNote || null,
  });

  if (error) backToDoc(id, { error: `발행에 실패했습니다. (${error.message})` });

  revalidateDocs(id);
  backToDoc(id, { published: String(version ?? "") });
}

export async function setDocumentStatus(formData: FormData) {
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (!id || (status !== "archived" && status !== "draft")) redirect("/admin/docs");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("documents").update({ status, updated_by: user?.id ?? null }).eq("id", id);

  if (error) backToDoc(id, { error: `상태 변경에 실패했습니다. (${error.message})` });

  revalidateDocs(id);
  backToDoc(id, { saved: "1" });
}

export async function deleteDocument(formData: FormData) {
  const id = str(formData, "id");
  if (!id) redirect("/admin/docs");

  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) backToDoc(id, { error: `삭제에 실패했습니다. (${error.message})` });

  revalidateDocs();
  redirect("/admin/docs?deleted=1");
}

export async function restoreRevision(formData: FormData) {
  const id = str(formData, "id");
  const revisionId = str(formData, "revision_id");
  if (!id || !/^\d+$/.test(revisionId)) redirect("/admin/docs");

  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_document_revision", { p_revision_id: Number(revisionId) });
  if (error) backToDoc(id, { error: `복원에 실패했습니다. (${error.message})` });

  revalidateDocs(id);
  backToDoc(id, { restored: "1" });
}
