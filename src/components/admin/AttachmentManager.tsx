"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ATTACHMENT_BUCKET, ATTACHMENT_MAX_BYTES, buildStoragePath, fileKind, formatBytes, type Attachment } from "@/lib/files";

/**
 * 관리자 문서 편집 화면의 첨부 파일 패널.
 * 브라우저에서 Storage 로 직접 올리고(RLS: 관리자만) 메타 행을 넣는다. 삭제는 파일·행을 함께 지운다.
 */
export function AttachmentManager({ documentId, initial }: { documentId: string; initial: Attachment[] }) {
  const router = useRouter();
  const [list, setList] = useState<Attachment[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    setError(null);
    const supabase = createClient();
    const failures: string[] = [];
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      setBusy(`${file.name} 올리는 중… (${i + 1}/${arr.length})`);
      if (file.size > ATTACHMENT_MAX_BYTES) {
        failures.push(`${file.name}: 50MB 를 넘습니다`);
        continue;
      }
      const path = buildStoragePath(documentId, file.name, crypto.randomUUID());
      const up = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (up.error) {
        failures.push(`${file.name}: ${up.error.message}`);
        continue;
      }
      const ins = await supabase
        .from("document_attachments")
        .insert({
          document_id: documentId,
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          sort_order: list.length + i,
        })
        .select("*")
        .single();
      if (ins.error || !ins.data) {
        await supabase.storage.from(ATTACHMENT_BUCKET).remove([path]);
        failures.push(`${file.name}: ${ins.error?.message ?? "저장 실패"}`);
        continue;
      }
      setList((prev) => [...prev, ins.data as Attachment]);
    }
    setBusy(null);
    if (failures.length) setError(failures.join(" / "));
    router.refresh();
  };

  const remove = async (a: Attachment) => {
    if (!confirm(`"${a.file_name}" 첨부를 삭제할까요? 임직원 화면에서도 사라집니다.`)) return;
    setError(null);
    setBusy(`${a.file_name} 삭제 중…`);
    const supabase = createClient();
    const del = await supabase.from("document_attachments").delete().eq("id", a.id);
    if (del.error) {
      setError(del.error.message);
    } else {
      await supabase.storage.from(ATTACHMENT_BUCKET).remove([a.storage_path]);
      setList((prev) => prev.filter((x) => x.id !== a.id));
    }
    setBusy(null);
    router.refresh();
  };

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">
            📎 첨부 파일 <span className="text-[13px] font-normal text-ink-3">{list.length}개</span>
          </h2>
          <p className="mt-0.5 text-[12px] text-ink-2">양식(엑셀·워드)과 규정 원문(PDF)을 올리면 임직원 화면 문서 상단에 &ldquo;내려받기&rdquo; 버튼으로 보입니다. 파일당 50MB 이하.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={Boolean(busy)}>
          파일 선택
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files);
        }}
        className={`mt-4 rounded-[12px] border border-dashed px-4 py-3 text-center text-[13px] transition-colors ${
          drag ? "border-accent-strong bg-accent-soft text-accent" : "border-hairline-strong text-ink-3"
        }`}
      >
        {busy ?? "여기로 파일을 끌어다 놓아도 됩니다"}
      </div>

      {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}

      {list.length ? (
        <ul className="mt-4 divide-y divide-hairline">
          {list.map((a) => {
            const kind = fileKind(a.file_name);
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <span aria-hidden className="text-[18px] leading-none">
                  {kind.icon}
                </span>
                <a href={`/api/files/${a.id}`} className="min-w-0 flex-1 truncate text-[14px] font-medium hover:text-accent" title={a.file_name}>
                  {a.file_name}
                </a>
                <span className="shrink-0 text-[12px] text-ink-3">
                  {kind.label}
                  {a.size_bytes ? ` · ${formatBytes(a.size_bytes)}` : ""}
                </span>
                <button type="button" className="btn-danger h-8 px-3 text-[12.5px]" onClick={() => remove(a)} disabled={Boolean(busy)}>
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-[13px] text-ink-3">아직 첨부가 없습니다.</p>
      )}
    </section>
  );
}
