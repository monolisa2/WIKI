import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentForm } from "@/components/DocumentForm";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Category, Document, DocumentInput } from "@/lib/types";
import { AttachmentManager } from "@/components/admin/AttachmentManager";
import type { Attachment } from "@/lib/files";
import { deleteDocument, publishDocument, setDocumentStatus } from "../actions";

type Params = { id: string };
type Query = { saved?: string; published?: string; restored?: string; error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toInput(d: Document): DocumentInput {
  return {
    category_id: String(d.category_id),
    slug: d.slug,
    title: d.title,
    summary: d.summary ?? "",
    body_md: d.body_md ?? "",
    doc_type: d.doc_type,
    icon: d.icon ?? "",
    scope: d.scope,
    source_system: d.source_system ?? "",
    source_url: d.source_url ?? "",
    owner_team: d.owner_team ?? "",
    effective_date: d.effective_date ?? "",
    revised_date: d.revised_date ?? "",
    is_pinned: Boolean(d.is_pinned),
    sort_order: String(d.sort_order ?? 0),
  };
}

export default async function EditDocumentPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Query> }) {
  const { id } = await params;
  const q = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: docData }, { data: catData }, { data: latestRev }, { data: attData }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("document_revisions").select("version, revised_at, change_note").eq("document_id", id).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("document_attachments").select("*").eq("document_id", id).order("sort_order").order("created_at"),
  ]);
  const attachments = (attData ?? []) as Attachment[];

  if (!docData) notFound();
  const doc = docData as Document;
  const categories = (catData ?? []) as Category[];
  const rev = latestRev as { version: number; revised_at: string; change_note: string | null } | null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-ink-2">
            <Link href="/admin/docs" className="hover:text-ink">
              문서
            </Link>
            <span>/</span>
            <span className="font-mono">{doc.slug}</span>
          </div>
          <h1 className="mt-1 text-xl font-black tracking-tight truncate">{doc.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-2">
            <StatusBadge status={doc.status} />
            {rev ? (
              <span>
                v{rev.version} · {formatDateTime(rev.revised_at)} 발행
              </span>
            ) : (
              <span>아직 발행되지 않음</span>
            )}
            <span>· 수정 {formatDateTime(doc.updated_at)}</span>
            {doc.revised_date ? <span>· 최종 개정일 {formatDate(doc.revised_date)}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {doc.source_url ? (
            <a href={doc.source_url} target="_blank" rel="noreferrer" className="btn-ghost">
              원문 보기 ↗
            </a>
          ) : null}
          <Link href={`/admin/docs/${doc.id}/revisions`} className="btn-ghost">
            개정 이력{rev ? ` (${rev.version})` : ""}
          </Link>
          {doc.status === "archived" ? (
            <form action={setDocumentStatus}>
              <input type="hidden" name="id" value={doc.id} />
              <input type="hidden" name="status" value="draft" />
              <button type="submit" className="btn-secondary">
                보관 해제
              </button>
            </form>
          ) : (
            <form action={setDocumentStatus}>
              <input type="hidden" name="id" value={doc.id} />
              <input type="hidden" name="status" value="archived" />
              <ConfirmButton message="이 문서를 보관 처리할까요? 임직원 화면에서 사라집니다." className="btn-ghost">
                보관
              </ConfirmButton>
            </form>
          )}
          <form action={deleteDocument}>
            <input type="hidden" name="id" value={doc.id} />
            <ConfirmButton message="문서와 개정 이력·첨부를 모두 삭제합니다. 되돌릴 수 없습니다. 삭제할까요?" className="btn-danger">
              삭제
            </ConfirmButton>
          </form>
        </div>
      </div>

      {q.saved ? <Notice tone="ok">저장했습니다.</Notice> : null}
      {q.published ? <Notice tone="ok">v{q.published} 으로 발행했습니다. 임직원 화면에 공개됩니다.</Notice> : null}
      {q.restored ? <Notice tone="ok">이전 버전 내용을 불러왔습니다. 확인 후 다시 발행하면 반영됩니다.</Notice> : null}
      {q.error ? <Notice tone="error">{q.error}</Notice> : null}

      {/* 발행: 저장된 내용을 스냅샷으로 남기고 published 로 전환 */}
      <form action={publishDocument} className="card mt-6 p-4 flex flex-wrap items-end gap-3 border-hairline-strong">
        <input type="hidden" name="id" value={doc.id} />
        <div className="flex-1 min-w-[240px]">
          <label className="label" htmlFor="change_note">
            변경 메모 (개정 이력에 남습니다)
          </label>
          <input id="change_note" name="change_note" className="input" placeholder={rev ? "예: 경조휴가 일수 개정" : "예: 최초 등록"} />
        </div>
        <button type="submit" className="btn-primary">
          {doc.status === "published" ? "개정 발행" : "발행"}
        </button>
        <p className="w-full text-[11px] text-ink-2 -mt-1">
          발행은 <strong>저장된</strong> 내용을 기준으로 합니다. 아래 폼을 수정했다면 먼저 저장해주세요.
        </p>
      </form>

      <div className="mt-6">
        <AttachmentManager documentId={doc.id} initial={attachments} />
      </div>

      <div className="mt-6">
        <DocumentForm categories={categories} docId={doc.id} initial={toInput(doc)} />
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p className={`mt-4 text-sm rounded-lg px-4 py-2 ${tone === "ok" ? "bg-accent-soft text-accent" : "bg-danger/8 text-danger"}`}>{children}</p>
  );
}
