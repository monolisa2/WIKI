import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { TypeBadge } from "@/components/TypeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { DocToc } from "@/components/DocToc";
import { DEFAULT_CATEGORY_ICON, docIcon } from "@/lib/constants";
import { scopeLabel, sourceLabel } from "@/lib/labels";
import { formatDate, formatDateTime, isStale } from "@/lib/format";
import { extractToc } from "@/lib/toc";
import type { Document } from "@/lib/types";

export type DocViewDocument = Document & { categories: { slug: string; name: string; icon?: string | null } | null };
export type DocViewRevision = { version: number; change_note: string | null; revised_at: string };

/**
 * 문서 상세 화면 (노션형): 흰 시트 위에 큰 이모지 아이콘 · 제목 · 인용형 요약 · 속성 줄 · 본문 · 우측 목차.
 * 데이터를 받지 않는 표현 컴포넌트라 미리보기·테스트에서 그대로 쓸 수 있다.
 */
export function DocView({
  doc,
  revisions,
  feedback,
  feedbackAction,
}: {
  doc: DocViewDocument;
  revisions: DocViewRevision[];
  feedback?: string;
  feedbackAction: (formData: FormData) => void | Promise<void>;
}) {
  const category = doc.categories;
  const source = sourceLabel(doc.source_system);
  const isLink = doc.doc_type === "link";
  // 제목이 3개 이상인 긴 문서(규정 전문 등)에만 우측 목차를 붙인다.
  const toc = isLink ? [] : extractToc(doc.body_md);
  const hasToc = toc.length >= 3;

  return (
    <div className="bg-surface">
      <article className="wrap py-9 sm:py-12">
        <nav aria-label="경로" className="flex items-center gap-1.5 text-[13px] text-ink-3">
          <Link href="/" className="hover:text-ink">
            홈
          </Link>
          {category ? (
            <>
              <span aria-hidden>/</span>
              <Link href={`/#cat-${category.slug}`} className="inline-flex items-center gap-1 hover:text-ink">
                <span aria-hidden>{category.icon?.trim() || DEFAULT_CATEGORY_ICON}</span>
                {category.name}
              </Link>
            </>
          ) : null}
        </nav>

        <header className="mt-7">
          <div aria-hidden className="text-[56px] leading-none sm:text-[64px]">
            {docIcon(doc.icon, doc.doc_type)}
          </div>
          <div className="mt-5 flex items-center gap-2">
            <TypeBadge type={doc.doc_type} />
            {doc.status !== "published" ? <StatusBadge status={doc.status} /> : null}
          </div>
          <h1 className="mt-2.5 text-[32px] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[42px]">{doc.title}</h1>
          {doc.summary ? (
            <p className="mt-4 max-w-3xl border-l-[3px] border-hairline-strong pl-4 text-[16px] leading-[1.8] text-ink-2 sm:text-[17px]">{doc.summary}</p>
          ) : null}

          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-hairline py-4 text-[14px] sm:grid-cols-4">
            <Meta label="적용 범위">{scopeLabel(doc.scope)}</Meta>
            <Meta label="담당 부서">{doc.owner_team || "—"}</Meta>
            <Meta label="시행일">{formatDate(doc.effective_date) || "—"}</Meta>
            <Meta label="최종 개정일">
              {doc.revised_date ? (
                <span className={isStale(doc.revised_date) ? "text-warn" : undefined}>{formatDate(doc.revised_date)}</span>
              ) : (
                <span className="badge bg-warn-soft text-warn">내용 수집 필요</span>
              )}
            </Meta>
          </dl>

          {source || doc.source_url ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
              <span>원본 출처: {source ?? "—"}</span>
              {doc.source_url ? (
                <a href={doc.source_url} target="_blank" rel="noreferrer" className="btn-secondary h-8 px-3 text-[13px]">
                  원문 보기 ↗
                </a>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className={`mt-9 ${hasToc ? "lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start lg:gap-12" : ""}`}>
          <div className="min-w-0">
            {isLink ? (
              <div className="callout callout-note" data-emoji="🔗" role="note">
                <p>이 문서는 원문 링크로 제공됩니다.</p>
                {doc.source_url ? (
                  <p>
                    <a href={doc.source_url} target="_blank" rel="noreferrer" className="btn-primary h-10 px-5 text-[14px] no-underline">
                      원문 열기 ↗
                    </a>
                  </p>
                ) : (
                  <p className="text-[13px] text-ink-3">원문 URL 이 아직 등록되지 않았습니다.</p>
                )}
              </div>
            ) : doc.body_md ? (
              <Markdown>{doc.body_md}</Markdown>
            ) : (
              <div className="callout callout-plain" data-emoji="🟠" role="note">
                <p>본문이 아직 등록되지 않았습니다. 제목과 위치만 먼저 등록한 문서입니다.</p>
              </div>
            )}

            <details className="mt-12 border-t border-hairline pt-3">
              <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                <span>개정 이력</span>
                <span className="text-[13px] font-normal text-ink-3">{revisions.length ? `${revisions.length}개 버전` : "기록 없음"}</span>
              </summary>
              {revisions.length ? (
                <ol className="divide-y divide-hairline">
                  {revisions.map((r) => (
                    <li key={r.version} className="flex items-baseline gap-4 py-2.5 text-[13px]">
                      <span className="w-9 shrink-0 font-medium tabular-nums">v{r.version}</span>
                      <span className="flex-1 text-ink-2">{r.change_note || "—"}</span>
                      <time className="shrink-0 text-ink-3" dateTime={r.revised_at}>
                        {formatDateTime(r.revised_at)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="py-2 text-[13px] text-ink-3">발행 기록이 없습니다.</p>
              )}
            </details>

            <section id="feedback" className="mt-6 scroll-mt-24 rounded-[16px] bg-surface-2 p-6">
              <h2 className="text-[15px] font-semibold">이 문서에 오류나 누락이 있나요?</h2>
              <p className="mt-1 text-[13px] text-ink-2">알려주시면 인사관리실이 확인하고 반영합니다.</p>
              {feedback === "sent" ? (
                <p className="mt-4 rounded-field bg-accent-soft px-4 py-3 text-[14px] text-accent">제보가 접수되었습니다. 감사합니다.</p>
              ) : (
                <form action={feedbackAction} className="mt-4 space-y-3">
                  <input type="hidden" name="document_id" value={doc.id} />
                  <input type="hidden" name="slug" value={doc.slug} />
                  <textarea
                    name="message"
                    required
                    minLength={5}
                    maxLength={2000}
                    rows={3}
                    className="input resize-y"
                    placeholder="예: 식권 사용 시간이 바뀐 것 같아요"
                  />
                  {feedback === "error" ? (
                    <p className="text-[13px] text-danger">제보를 저장하지 못했습니다. 5자 이상 입력했는지 확인하고 다시 시도해주세요.</p>
                  ) : null}
                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary">
                      제보하기
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>

          {hasToc ? (
            <aside className="hidden lg:block lg:sticky lg:top-20">
              <DocToc items={toc} />
            </aside>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}
