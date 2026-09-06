"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_BUCKET, ATTACHMENT_MAX_BYTES, buildStoragePath, fileKind, formatBytes, parseBulkName } from "@/lib/files";

type Row = {
  file: File;
  slug: string | null;
  fileName: string;
  doc: { id: string; title: string } | null;
  state: "ready" | "skip" | "done" | "error" | "unmatched" | "badname";
  note?: string;
};

/**
 * 첨부 일괄 등록: 파일 이름을 "<문서 slug>__<파일 이름>.<ext>" 로 맞춰 여러 개를 한 번에 올린다.
 * 같은 문서에 같은 이름의 첨부가 이미 있으면 건너뛴다 (재실행 안전).
 */
export function BulkAttachmentImport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prepare = async (files: FileList) => {
    setBusy("문서 확인 중…");
    const supabase = createClient();
    const parsed = Array.from(files).map((file) => {
      const p = parseBulkName(file.name);
      return { file, slug: p?.slug ?? null, fileName: p?.fileName ?? file.name };
    });
    const slugs = Array.from(new Set(parsed.map((p) => p.slug).filter((s): s is string => Boolean(s))));
    const { data: docs } = slugs.length ? await supabase.from("documents").select("id, slug, title").in("slug", slugs) : { data: [] };
    const bySlug = new Map((docs ?? []).map((d) => [d.slug as string, { id: d.id as string, title: d.title as string }]));
    const ids = Array.from(bySlug.values()).map((d) => d.id);
    const { data: existing } = ids.length ? await supabase.from("document_attachments").select("document_id, file_name").in("document_id", ids) : { data: [] };
    const have = new Set((existing ?? []).map((e) => `${e.document_id}::${e.file_name}`));

    setRows(
      parsed.map<Row>((p) => {
        if (!p.slug) return { ...p, doc: null, state: "badname", note: "이름이 slug__파일명 형식이 아닙니다" };
        const doc = bySlug.get(p.slug) ?? null;
        if (!doc) return { ...p, doc: null, state: "unmatched", note: `"${p.slug}" 문서가 없습니다` };
        if (p.file.size > ATTACHMENT_MAX_BYTES) return { ...p, doc, state: "error", note: "50MB 초과" };
        if (have.has(`${doc.id}::${p.fileName}`)) return { ...p, doc, state: "skip", note: "이미 같은 이름의 첨부가 있어 건너뜁니다" };
        return { ...p, doc, state: "ready" };
      }),
    );
    setBusy(null);
  };

  const run = async () => {
    const supabase = createClient();
    const targets = rows.filter((r) => r.state === "ready");
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i];
      setBusy(`${r.fileName} 올리는 중… (${i + 1}/${targets.length})`);
      const path = buildStoragePath(r.doc!.id, r.fileName, crypto.randomUUID());
      const up = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, r.file, { contentType: r.file.type || undefined, upsert: false });
      let state: Row["state"] = "done";
      let note: string | undefined;
      if (up.error) {
        state = "error";
        note = up.error.message;
      } else {
        const ins = await supabase.from("document_attachments").insert({
          document_id: r.doc!.id,
          storage_path: path,
          file_name: r.fileName,
          mime_type: r.file.type || null,
          size_bytes: r.file.size,
          sort_order: i,
        });
        if (ins.error) {
          await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
          state = "error";
          note = ins.error.message;
        }
      }
      setRows((prev) => prev.map((x) => (x === r ? { ...x, state, note } : x)));
    }
    setBusy(null);
  };

  const ready = rows.filter((r) => r.state === "ready").length;
  const done = rows.filter((r) => r.state === "done").length;

  return (
    <div className="space-y-5">
      <div className="callout callout-note my-0!" data-emoji="📦" role="note">
        <p>
          <strong>파일 이름 규칙</strong>: <code>문서주소__파일이름.확장자</code> (밑줄 두 개). 예:{" "}
          <code>form-anniversary-check__결혼기념일 확인.xlsx</code> → &ldquo;결혼기념일 확인 양식&rdquo; 문서에 <code>결혼기념일 확인.xlsx</code> 로 붙습니다.
        </p>
        <p>문서주소는 /admin/docs 목록의 slug 이거나, 임직원 화면 주소 /docs/ 뒤의 글자입니다. 여러 파일을 한 번에 골라도 됩니다.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={Boolean(busy)}>
          파일 선택
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void prepare(e.target.files);
            e.target.value = "";
          }}
        />
        {ready ? (
          <button type="button" className="btn-primary" onClick={run} disabled={Boolean(busy)}>
            {ready}개 올리기
          </button>
        ) : null}
        {busy ? <span className="text-[13px] text-ink-2">{busy}</span> : null}
        {!busy && done ? <span className="text-[13px] text-accent">{done}개 등록 완료</span> : null}
      </div>

      {rows.length ? (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>파일</th>
                <th>문서</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span aria-hidden className="mr-1.5">
                      {fileKind(r.fileName).icon}
                    </span>
                    {r.fileName} <span className="text-ink-3">· {formatBytes(r.file.size)}</span>
                  </td>
                  <td>
                    {r.doc ? (
                      <Link href={`/admin/docs/${r.doc.id}`} className="hover:text-accent">
                        {r.doc.title}
                      </Link>
                    ) : (
                      <span className="text-ink-3">{r.slug ?? "—"}</span>
                    )}
                  </td>
                  <td>
                    <StateBadge state={r.state} />
                    {r.note ? <span className="ml-2 text-[12px] text-ink-3">{r.note}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function StateBadge({ state }: { state: Row["state"] }) {
  const map: Record<Row["state"], [string, string]> = {
    ready: ["올릴 예정", "bg-accent-soft text-accent"],
    done: ["완료", "bg-accent-bright text-ink"],
    skip: ["건너뜀", "bg-black/[0.06] text-ink-2"],
    error: ["실패", "bg-danger/10 text-danger"],
    unmatched: ["문서 없음", "bg-warn-soft text-warn"],
    badname: ["이름 형식 오류", "bg-warn-soft text-warn"],
  };
  const [label, cls] = map[state];
  return <span className={`badge ${cls}`}>{label}</span>;
}
