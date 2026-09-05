"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { saveDocument, type DocFormState } from "@/app/admin/docs/actions";
import { DOC_TYPES, SCOPES, SOURCE_SYSTEMS, type DocType, type Scope, type SourceSystem } from "@/lib/constants";
import type { Category, DocumentInput } from "@/lib/types";

/** 문서 템플릿 (개발 명세 6번) */
export const BODY_TEMPLATE = `## 적용 범위
(전 계열사 / 특정 법인)

## 내용
...

## 신청 · 처리 방법
(경로: 그룹웨어 전자결재 > ... )

## 관련 문서
- ...

> 이 안내는 취업규칙 및 관련 규정에 따릅니다. 내용이 다를 경우 원문 규정이 우선합니다.
`;

export const EMPTY_INPUT: DocumentInput = {
  category_id: "",
  slug: "",
  title: "",
  summary: "",
  body_md: BODY_TEMPLATE,
  doc_type: "guide",
  scope: ["all"],
  source_system: "wiki",
  source_url: "",
  owner_team: "인사관리실",
  effective_date: "",
  revised_date: "",
  is_pinned: false,
  sort_order: "0",
};

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function DocumentForm({
  categories,
  docId,
  initial,
}: {
  categories: Category[];
  docId?: string;
  initial?: DocumentInput;
}) {
  const [state, action, pending] = useActionState<DocFormState, FormData>(saveDocument, {});
  const [v, setV] = useState<DocumentInput>(initial ?? EMPTY_INPUT);
  const [preview, setPreview] = useState(false);

  const set = <K extends keyof DocumentInput>(key: K, value: DocumentInput[K]) => setV((prev) => ({ ...prev, [key]: value }));

  const toggleScope = (s: Scope, checked: boolean) => {
    setV((prev) => {
      if (s === "all") return { ...prev, scope: checked ? ["all"] : [] };
      const without = prev.scope.filter((x) => x !== "all" && x !== s);
      return { ...prev, scope: checked ? [...without, s] : without };
    });
  };

  const isLink = v.doc_type === "link";

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      {docId ? <input type="hidden" name="id" value={docId} /> : null}

      {/* 좌측: 본문 */}
      <div className="space-y-4">
        <div className="card p-5 space-y-4">
          <div>
            <label className="label" htmlFor="title">
              제목 *
            </label>
            <input
              id="title"
              name="title"
              className="input text-base font-semibold"
              value={v.title}
              onChange={(e) => set("title", e.target.value)}
              onBlur={() => {
                if (!v.slug && v.title) set("slug", slugify(v.title));
              }}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <div>
              <label className="label" htmlFor="slug">
                slug (URL) *
              </label>
              <input
                id="slug"
                name="slug"
                className="input font-mono text-xs"
                value={v.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="예: annual-leave"
                required
              />
              <p className="mt-1 text-[11px] text-ink-soft">/docs/{v.slug || "…"}</p>
            </div>
            <div>
              <label className="label" htmlFor="owner_team">
                담당 부서
              </label>
              <input id="owner_team" name="owner_team" className="input" value={v.owner_team} onChange={(e) => set("owner_team", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="summary">
              요약 (검색 결과에 보이는 한 줄)
            </label>
            <input id="summary" name="summary" className="input" value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={200} />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <label className="label mb-0" htmlFor="body_md">
              본문 (Markdown)
            </label>
            <div className="flex items-center gap-1 text-xs">
              <button type="button" className={preview ? "btn-ghost" : "btn-secondary"} onClick={() => setPreview(false)}>
                편집
              </button>
              <button type="button" className={preview ? "btn-secondary" : "btn-ghost"} onClick={() => setPreview(true)}>
                미리보기
              </button>
            </div>
          </div>

          {isLink ? (
            <p className="text-sm text-ink-soft bg-brand-pale rounded-lg p-4">
              링크 문서는 본문 없이 <strong>원문 URL</strong> 만 저장합니다. 우측 패널에서 URL 을 입력해주세요.
            </p>
          ) : preview ? (
            <div className="min-h-[420px] rounded-lg border border-brand-line p-5">
              {v.body_md.trim() ? <Markdown>{v.body_md}</Markdown> : <p className="text-sm text-ink-soft">본문이 비어 있습니다.</p>}
            </div>
          ) : (
            <textarea
              id="body_md"
              name="body_md"
              className="input font-mono text-[13px] leading-relaxed min-h-[420px] resize-y"
              value={v.body_md}
              onChange={(e) => set("body_md", e.target.value)}
              spellCheck={false}
            />
          )}
          {/* 미리보기 중에도 값이 전송되도록 */}
          {preview && !isLink ? <input type="hidden" name="body_md" value={v.body_md} /> : null}
        </div>
      </div>

      {/* 우측: 메타 패널 */}
      <aside className="space-y-4 lg:sticky lg:top-6">
        <div className="card p-5 space-y-4">
          <div>
            <label className="label" htmlFor="category_id">
              분류 *
            </label>
            <select id="category_id" name="category_id" className="input" value={v.category_id} onChange={(e) => set("category_id", e.target.value)} required>
              <option value="">선택</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="doc_type">
              문서 유형 *
            </label>
            <select id="doc_type" name="doc_type" className="input" value={v.doc_type} onChange={(e) => set("doc_type", e.target.value as DocType)}>
              {(Object.keys(DOC_TYPES) as DocType[]).map((k) => (
                <option key={k} value={k}>
                  {DOC_TYPES[k]} ({k})
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="label">적용 범위</legend>
            <div className="grid grid-cols-2 gap-1.5 text-sm">
              {(Object.keys(SCOPES) as Scope[]).map((s) => (
                <label key={s} className="inline-flex items-center gap-2">
                  <input type="checkbox" name="scope" value={s} checked={v.scope.includes(s)} onChange={(e) => toggleScope(s, e.target.checked)} className="accent-brand" />
                  {SCOPES[s]}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="source_system">
              원본 시스템
            </label>
            <select id="source_system" name="source_system" className="input" value={v.source_system} onChange={(e) => set("source_system", e.target.value as SourceSystem | "")}>
              <option value="">(없음)</option>
              {(Object.keys(SOURCE_SYSTEMS) as SourceSystem[]).map((k) => (
                <option key={k} value={k}>
                  {SOURCE_SYSTEMS[k]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="source_url">
              원문 URL {isLink ? "*" : ""}
            </label>
            <input id="source_url" name="source_url" type="url" className="input font-mono text-xs" value={v.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder="https://" required={isLink} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="effective_date">
                시행일
              </label>
              <input id="effective_date" name="effective_date" type="date" className="input" value={v.effective_date} onChange={(e) => set("effective_date", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="revised_date">
                최종 개정일
              </label>
              <input id="revised_date" name="revised_date" type="date" className="input" value={v.revised_date} onChange={(e) => set("revised_date", e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-ink-soft -mt-2">개정일이 비어 있으면 임직원 화면에 &quot;내용 수집 필요&quot;로 표시됩니다.</p>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label" htmlFor="sort_order">
                정렬 순서
              </label>
              <input id="sort_order" name="sort_order" type="number" className="input" value={v.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm pb-2">
              <input type="checkbox" name="is_pinned" checked={v.is_pinned} onChange={(e) => set("is_pinned", e.target.checked)} className="accent-brand" />
              상단 고정
            </label>
          </div>
        </div>

        {state.error ? <p className="text-sm text-danger card p-3 border-danger/40">{state.error}</p> : null}

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={pending}>
            {pending ? "저장 중…" : docId ? "저장" : "작성 중으로 저장"}
          </button>
          <Link href={docId ? `/admin/docs/${docId}` : "/admin/docs"} className="btn-ghost">
            취소
          </Link>
        </div>
        {!docId ? <p className="text-[11px] text-ink-soft">저장 후 편집 화면에서 &quot;발행&quot;하면 임직원에게 공개되고 개정 이력이 남습니다.</p> : null}
      </aside>
    </form>
  );
}
