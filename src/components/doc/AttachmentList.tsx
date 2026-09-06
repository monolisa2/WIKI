import { fileKind, formatBytes, type Attachment } from "@/lib/files";

/** 문서 상단 첨부 파일 상자: 양식·원문 파일을 바로 내려받는다 (임직원 화면) */
export function AttachmentList({ attachments, emphasis = false }: { attachments: Attachment[]; emphasis?: boolean }) {
  if (attachments.length === 0) return null;
  return (
    <section
      aria-label="첨부 파일"
      className={`rounded-[14px] border ${emphasis ? "border-accent-line bg-accent-soft/60" : "border-hairline bg-surface-2"} px-5 py-4`}
    >
      <h2 className="flex items-center gap-2 text-[14px] font-semibold">
        <span aria-hidden>📎</span> 첨부 파일
        <span className="text-[13px] font-normal text-ink-3">{attachments.length}개</span>
      </h2>
      <ul className="mt-2.5 divide-y divide-hairline">
        {attachments.map((a) => {
          const kind = fileKind(a.file_name);
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
              <span aria-hidden className="text-[20px] leading-none">
                {kind.icon}
              </span>
              <a href={`/api/files/${a.id}`} className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink hover:text-accent" title={a.file_name}>
                {a.file_name}
              </a>
              <span className="shrink-0 text-[12.5px] text-ink-3">
                {kind.label}
                {a.size_bytes ? ` · ${formatBytes(a.size_bytes)}` : ""}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {kind.inline ? (
                  <a href={`/api/files/${a.id}?view=1`} target="_blank" rel="noreferrer" className="btn-secondary h-8 px-3 text-[12.5px]">
                    보기
                  </a>
                ) : null}
                <a href={`/api/files/${a.id}`} className="btn-primary h-8 px-3 text-[12.5px]">
                  내려받기
                </a>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
