import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Markdown } from "@/components/Markdown";
import { formatDateTime } from "@/lib/format";
import type { Document, DocumentRevision } from "@/lib/types";
import { restoreRevision } from "../../actions";

type RevRow = DocumentRevision & { profiles: { name: string | null; email: string } | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 개정 이력: 버전 목록 + 본문 보기 + 특정 버전 복원. 버전 간 diff 는 후순위. */
export default async function RevisionsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  const { v } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: docData }, { data: revData }] = await Promise.all([
    supabase.from("documents").select("id, title, slug, status, body_md").eq("id", id).maybeSingle(),
    supabase
      .from("document_revisions")
      .select("*, profiles:revised_by(name, email)")
      .eq("document_id", id)
      .order("version", { ascending: false }),
  ]);
  if (!docData) notFound();

  const doc = docData as Pick<Document, "id" | "title" | "slug" | "status" | "body_md">;
  const revisions = (revData ?? []) as unknown as RevRow[];
  const selected = revisions.find((r) => String(r.version) === v) ?? revisions[0];

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-ink-2">
        <Link href="/admin/docs" className="hover:text-ink">
          문서
        </Link>
        <span>/</span>
        <Link href={`/admin/docs/${doc.id}`} className="hover:text-ink">
          {doc.title}
        </Link>
        <span>/</span>
        <span>개정 이력</span>
      </div>
      <h1 className="mt-1 text-xl font-bold tracking-tight">개정 이력</h1>

      {revisions.length === 0 ? (
        <p className="card mt-6 p-8 text-center text-sm text-ink-2">
          아직 발행된 버전이 없습니다.{" "}
          <Link href={`/admin/docs/${doc.id}`} className="underline">
            편집 화면
          </Link>
          에서 발행하면 첫 버전이 기록됩니다.
        </p>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
          <ol className="card divide-y divide-hairline">
            {revisions.map((r) => {
              const active = r.id === selected?.id;
              return (
                <li key={r.id} className={active ? "bg-black/[0.04]" : ""}>
                  <Link href={`/admin/docs/${doc.id}/revisions?v=${r.version}`} className="block px-4 py-3 hover:bg-black/[0.03]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">v{r.version}</span>
                      <span className="text-[11px] text-ink-2">{formatDateTime(r.revised_at)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-2 truncate">{r.change_note || "(메모 없음)"}</p>
                    <p className="text-[11px] text-ink-2">{r.profiles?.name ?? r.profiles?.email ?? ""}</p>
                  </Link>
                </li>
              );
            })}
          </ol>

          {selected ? (
            <div className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-hairline">
                <div>
                  <h2 className="font-bold">
                    v{selected.version} · {selected.title}
                  </h2>
                  <p className="text-xs text-ink-2 mt-0.5">{selected.summary}</p>
                </div>
                <form action={restoreRevision}>
                  <input type="hidden" name="id" value={doc.id} />
                  <input type="hidden" name="revision_id" value={selected.id} />
                  <ConfirmButton
                    message={`v${selected.version} 의 제목·요약·본문을 현재 문서에 덮어씁니다. 발행 전까지 임직원 화면에는 반영되지 않습니다. 계속할까요?`}
                    className="btn-secondary"
                  >
                    이 버전으로 복원
                  </ConfirmButton>
                </form>
              </div>
              <div className="mt-4">
                {selected.body_md ? <Markdown>{selected.body_md}</Markdown> : <p className="text-sm text-ink-2">본문 없음 (링크 문서)</p>}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
