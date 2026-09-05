import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Markdown } from "@/components/Markdown";
import { TypeBadge } from "@/components/TypeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { scopeLabel, sourceLabel } from "@/components/DocRow";
import { formatDate, formatDateTime, isStale } from "@/lib/format";
import type { Document } from "@/lib/types";
import { submitFeedback } from "./actions";

type DocWithCategory = Document & { categories: { slug: string; name: string } | null };
type Rev = { version: number; change_note: string | null; revised_at: string };

function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function loadDocument(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("*, categories(slug, name)").eq("slug", slug).maybeSingle();
  return { supabase, doc: (data as DocWithCategory | null) ?? null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { doc } = await loadDocument(decodeSlug(slug));
  return { title: doc?.title ?? "문서", description: doc?.summary ?? undefined };
}

/** 문서 상세 `/docs/[slug]` (명세 3-1): 본문 + 메타 + 개정 이력(접힘) + 원문 보기 + 제보 */
export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ feedback?: string }>;
}) {
  const { slug: rawSlug } = await params;
  const { feedback } = await searchParams;
  const slug = decodeSlug(rawSlug);

  const { supabase, doc } = await loadDocument(slug);
  if (!doc) notFound();

  const { data: revData } = await supabase
    .from("document_revisions")
    .select("version, change_note, revised_at")
    .eq("document_id", doc.id)
    .order("version", { ascending: false });
  const revisions = (revData ?? []) as Rev[];

  const category = doc.categories;
  const source = sourceLabel(doc.source_system);
  const isLink = doc.doc_type === "link";

  return (
    <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <nav aria-label="경로" className="flex items-center gap-1.5 text-[13px] text-ink-3">
        <Link href="/" className="hover:text-ink">
          홈
        </Link>
        {category ? (
          <>
            <span aria-hidden>/</span>
            <Link href={`/#cat-${category.slug}`} className="hover:text-ink">
              {category.name}
            </Link>
          </>
        ) : null}
      </nav>

      <header className="mt-5">
        <div className="flex items-center gap-2">
          <TypeBadge type={doc.doc_type} />
          {doc.status !== "published" ? <StatusBadge status={doc.status} /> : null}
        </div>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[40px]">{doc.title}</h1>
        {doc.summary ? <p className="mt-3 text-[17px] leading-relaxed text-ink-2">{doc.summary}</p> : null}

        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] sm:grid-cols-4">
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
          <div className="mt-5 flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
            <span>원본 출처: {source ?? "—"}</span>
            {doc.source_url ? (
              <a href={doc.source_url} target="_blank" rel="noreferrer" className="btn-secondary h-8 px-3 text-[13px]">
                원문 보기 ↗
              </a>
            ) : null}
          </div>
        ) : null}
      </header>

      {isLink ? (
        <div className="card mt-8 p-8 text-center sm:p-10">
          <p className="text-[15px] text-ink-2">이 문서는 원문 링크로 제공됩니다.</p>
          {doc.source_url ? (
            <a href={doc.source_url} target="_blank" rel="noreferrer" className="btn-primary mt-4 h-11 px-6 text-[15px]">
              원문 열기 ↗
            </a>
          ) : (
            <p className="mt-2 text-[13px] text-ink-3">원문 URL 이 아직 등록되지 않았습니다.</p>
          )}
        </div>
      ) : (
        <div className="card mt-8 px-6 py-8 sm:px-10 sm:py-10">
          {doc.body_md ? <Markdown>{doc.body_md}</Markdown> : <p className="text-[15px] text-ink-3">본문이 아직 등록되지 않았습니다.</p>}
        </div>
      )}

      <details className="card mt-6 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
          <span>개정 이력</span>
          <span className="text-[13px] font-normal text-ink-3">{revisions.length ? `${revisions.length}개 버전` : "기록 없음"}</span>
        </summary>
        {revisions.length ? (
          <ol className="hairline-t divide-y divide-hairline">
            {revisions.map((r) => (
              <li key={r.version} className="flex items-baseline gap-4 px-6 py-3 text-[13px]">
                <span className="w-9 shrink-0 font-medium tabular-nums">v{r.version}</span>
                <span className="flex-1 text-ink-2">{r.change_note || "—"}</span>
                <time className="shrink-0 text-ink-3" dateTime={r.revised_at}>
                  {formatDateTime(r.revised_at)}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="hairline-t px-6 py-4 text-[13px] text-ink-3">발행 기록이 없습니다.</p>
        )}
      </details>

      <section id="feedback" className="card mt-6 scroll-mt-24 p-6">
        <h2 className="text-[15px] font-semibold">이 문서에 오류나 누락이 있나요?</h2>
        <p className="mt-1 text-[13px] text-ink-2">알려주시면 인사관리실이 확인하고 반영합니다.</p>
        {feedback === "sent" ? (
          <p className="mt-4 rounded-field bg-accent-soft px-4 py-3 text-[14px] text-accent">제보가 접수되었습니다. 감사합니다.</p>
        ) : (
          <form action={submitFeedback} className="mt-4 space-y-3">
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
            {feedback === "error" ? <p className="text-[13px] text-danger">제보를 저장하지 못했습니다. 5자 이상 입력했는지 확인하고 다시 시도해주세요.</p> : null}
            <div className="flex justify-end">
              <button type="submit" className="btn-primary">
                제보하기
              </button>
            </div>
          </form>
        )}
      </section>
    </article>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}
