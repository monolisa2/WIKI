import Link from "next/link";
import { SCOPES, SOURCE_SYSTEMS, type Scope, type SourceSystem } from "@/lib/constants";
import { formatDate, isStale } from "@/lib/format";
import type { Document } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";

export type DocRowData = Pick<
  Document,
  "id" | "slug" | "title" | "summary" | "doc_type" | "scope" | "source_system" | "source_url" | "revised_date" | "is_pinned" | "owner_team"
>;

export function scopeLabel(scope: string[]) {
  if (scope.includes("all")) return SCOPES.all;
  return scope.map((s) => SCOPES[s as Scope] ?? s).join(" · ");
}

export function sourceLabel(source: string | null) {
  if (!source) return null;
  return SOURCE_SYSTEMS[source as SourceSystem] ?? source;
}

/** 임직원 화면 문서 행: 문서유형 · 제목 · 적용범위 · 요약 · 원본출처 · 최종개정일 (명세 3-1) */
export function DocRow({ doc }: { doc: DocRowData }) {
  const source = sourceLabel(doc.source_system);
  return (
    <li className="group">
      <Link
        href={`/docs/${doc.slug}`}
        className="grid gap-x-4 gap-y-1.5 px-5 py-4 transition-colors hover:bg-surface-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_9.5rem] sm:items-start"
      >
        <div className="pt-0.5">
          <TypeBadge type={doc.doc_type} />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[16px] font-medium leading-snug text-ink transition-colors group-hover:text-accent">
            {doc.is_pinned ? (
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-accent-strong" fill="currentColor" aria-label="고정">
                <path d="M9.5 1.5 14.5 6.5l-2.2.6-2.6 2.6.3 3.3-1.4 1.4L5.7 11.5 2.5 14.7l-1.2-1.2 3.2-3.2L1.6 7.4 3 6l3.3.3 2.6-2.6z" />
              </svg>
            ) : null}
            <span className="truncate">{doc.title}</span>
          </p>
          {doc.summary ? <p className="mt-0.5 line-clamp-2 text-[14px] leading-relaxed text-ink-2">{doc.summary}</p> : null}
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
            <span>{scopeLabel(doc.scope)}</span>
            {source ? (
              <>
                <Dot />
                <span>
                  {source}
                  {doc.source_url ? " ↗" : ""}
                </span>
              </>
            ) : null}
            {doc.owner_team ? (
              <>
                <Dot />
                <span>{doc.owner_team}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="text-[13px] sm:pt-0.5 sm:text-right">
          {doc.revised_date ? (
            <span className={isStale(doc.revised_date) ? "text-warn" : "text-ink-2"}>{formatDate(doc.revised_date)} 개정</span>
          ) : (
            <span className="badge bg-warn-soft text-warn">내용 수집 필요</span>
          )}
        </div>
      </Link>
    </li>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-ink-3/60">
      ·
    </span>
  );
}
