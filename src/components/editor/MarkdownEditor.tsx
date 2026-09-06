"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { createClient } from "@/lib/supabase/client";
import { DOC_TYPES, docIcon, type DocType } from "@/lib/constants";
import { CALLOUT_KINDS, type CalloutKind } from "@/lib/remark-callouts";
import { extractToc } from "@/lib/toc";
import { LIVE_KINDS, NINEHIRE_PAGES, liveTokenText, type LiveKind, type NinehirePage } from "@/lib/live-blocks";

/* ────────────────────────────────────────────────────────────────
   관리자용 마크다운 편집기
   - 문법을 몰라도 쓸 수 있게 버튼으로 제목·목록·표·콜아웃·링크를 넣는다.
   - "문서 링크"는 위키 문서 목록에서 골라 넣고, "조문 링크"는 규정 → 조문 순서로 고른다.
   - 오른쪽(또는 아래)에 미리보기가 실시간으로 뜬다.
   ──────────────────────────────────────────────────────────────── */

type Mode = "edit" | "split" | "preview";

type Selection = { start: number; end: number };

function lineStart(text: string, pos: number) {
  return text.lastIndexOf("\n", pos - 1) + 1;
}
function lineEnd(text: string, pos: number) {
  const i = text.indexOf("\n", pos);
  return i === -1 ? text.length : i;
}

export function MarkdownEditor({
  id,
  name,
  value,
  onChange,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const ta = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<Mode>("split");
  const [dialog, setDialog] = useState<null | "table" | "link" | "doc" | "article" | "callout" | "live">(null);
  const pendingSel = useRef<Selection | null>(null);

  // 값이 바뀐 뒤 커서 위치를 되돌린다
  useEffect(() => {
    const sel = pendingSel.current;
    if (!sel || !ta.current) return;
    pendingSel.current = null;
    ta.current.focus();
    ta.current.setSelectionRange(sel.start, sel.end);
  }, [value]);

  const current = useCallback((): Selection => {
    const el = ta.current;
    if (!el) return { start: value.length, end: value.length };
    return { start: el.selectionStart, end: el.selectionEnd };
  }, [value.length]);

  const apply = useCallback(
    (next: string, sel: Selection) => {
      pendingSel.current = sel;
      onChange(next);
    },
    [onChange],
  );

  /** 선택 영역을 before/after 로 감싼다. 선택이 없으면 placeholder 를 넣고 그 부분을 선택한다. */
  const wrap = useCallback(
    (before: string, after = "", placeholder = "내용") => {
      const { start, end } = current();
      const selected = value.slice(start, end) || placeholder;
      const next = value.slice(0, start) + before + selected + after + value.slice(end);
      apply(next, { start: start + before.length, end: start + before.length + selected.length });
    },
    [value, current, apply],
  );

  /** 선택된 줄들 앞에 prefix 를 붙인다 (이미 있으면 뗀다). numbered=true 면 1. 2. 3. */
  const prefixLines = useCallback(
    (prefix: string, numbered = false) => {
      const { start, end } = current();
      const s = lineStart(value, start);
      const e = lineEnd(value, Math.max(start, end - (end > start && value[end - 1] === "\n" ? 1 : 0)));
      const lines = value.slice(s, e).split("\n");
      const allHave = lines.every((l) => (numbered ? /^\d+\.\s/.test(l) : l.startsWith(prefix)));
      const out = lines.map((l, i) => {
        if (allHave) return numbered ? l.replace(/^\d+\.\s/, "") : l.slice(prefix.length);
        const clean = l.replace(/^(#{1,4}\s|[-*]\s|\d+\.\s)/, "");
        return numbered ? `${i + 1}. ${clean}` : `${prefix}${clean}`;
      });
      const block = out.join("\n");
      const next = value.slice(0, s) + block + value.slice(e);
      apply(next, { start: s, end: s + block.length });
    },
    [value, current, apply],
  );

  /** 블록(표·콜아웃·구분선)을 현재 위치에 줄 단위로 넣는다 */
  const insertBlock = useCallback(
    (block: string, selectInside?: { from: number; to: number }) => {
      const { start, end } = current();
      const before = value.slice(0, start);
      const after = value.slice(end);
      const pre = before.length === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
      const post = after.startsWith("\n") || after.length === 0 ? "\n" : "\n\n";
      const inserted = pre + block + post;
      const base = start + pre.length;
      const sel = selectInside ? { start: base + selectInside.from, end: base + selectInside.to } : { start: start + inserted.length, end: start + inserted.length };
      apply(before + inserted + after, sel);
    },
    [value, current, apply],
  );

  const insertInline = useCallback(
    (text: string) => {
      const { start, end } = current();
      apply(value.slice(0, start) + text + value.slice(end), { start: start + text.length, end: start + text.length });
    },
    [value, current, apply],
  );

  const selectedText = () => {
    const { start, end } = current();
    return value.slice(start, end);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
      e.preventDefault();
      wrap("**", "**", "강조");
    }
  };

  const preview = useMemo(() => value.trim(), [value]);

  return (
    <div>
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-t-[12px] border border-hairline-strong border-b-0 bg-surface-2 px-2.5 py-2">
        <ToolGroup>
          <Tool onClick={() => prefixLines("## ")} hint="큰 제목 (## )">
            제목
          </Tool>
          <Tool onClick={() => prefixLines("### ")} hint="작은 제목 (### )">
            소제목
          </Tool>
          <Tool onClick={() => wrap("**", "**", "강조")} hint="굵게 (Ctrl+B)">
            <b>굵게</b>
          </Tool>
        </ToolGroup>
        <ToolGroup>
          <Tool onClick={() => prefixLines("- ")} hint="글머리 기호 목록">
            • 목록
          </Tool>
          <Tool onClick={() => prefixLines("", true)} hint="번호 목록">
            1. 번호
          </Tool>
          <Tool onClick={() => setDialog("table")} hint="표 넣기">
            표
          </Tool>
          <Tool onClick={() => setDialog("callout")} hint="강조 상자(콜아웃) 넣기">
            💡 콜아웃
          </Tool>
          <Tool onClick={() => insertBlock("---")} hint="구분선">
            구분선
          </Tool>
        </ToolGroup>
        <ToolGroup>
          <Tool onClick={() => setDialog("doc")} hint="위키의 다른 문서로 연결" accent>
            문서 링크
          </Tool>
          <Tool onClick={() => setDialog("article")} hint="규정의 특정 조문으로 연결" accent>
            조문 링크
          </Tool>
          <Tool onClick={() => setDialog("link")} hint="외부 주소로 연결">
            외부 링크
          </Tool>
        </ToolGroup>
        <ToolGroup>
          <Tool onClick={() => setDialog("live")} hint="채용 사이트(열일레터·뉴스·채용 공고·회사 소개)의 최신 내용이 자동으로 들어오는 자리 만들기">
            🔄 연동 블록
          </Tool>
        </ToolGroup>
        <div className="ml-auto flex items-center gap-0.5 rounded-full bg-black/[0.05] p-0.5 text-[12px]">
          {(["edit", "split", "preview"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-full px-2.5 py-1 transition-colors ${mode === m ? "bg-surface font-medium text-ink shadow-soft" : "text-ink-2 hover:text-ink"}`}
            >
              {m === "edit" ? "편집" : m === "split" ? "나란히" : "미리보기"}
            </button>
          ))}
        </div>
      </div>

      {/* 편집 / 미리보기 */}
      <div className={`grid ${mode === "split" ? "xl:grid-cols-2" : ""}`}>
        <textarea
          ref={ta}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          className={`input min-h-[520px] resize-y rounded-t-none font-mono text-[13px] leading-relaxed ${
            mode === "preview" ? "hidden" : ""
          } ${mode === "split" ? "xl:rounded-r-none" : ""}`}
        />
        {mode !== "edit" ? (
          <div
            className={`min-h-[520px] overflow-y-auto border border-hairline-strong bg-surface px-6 py-5 ${
              mode === "split" ? "rounded-b-[12px] border-t-0 xl:rounded-bl-none xl:rounded-tr-none xl:border-l-0 xl:border-t" : "rounded-b-[12px] border-t-0"
            }`}
            aria-label="미리보기"
          >
            {preview ? <Markdown className="text-[15.5px]!">{value}</Markdown> : <p className="text-sm text-ink-3">본문이 비어 있습니다.</p>}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[11.5px] text-ink-3">
        문법을 몰라도 됩니다. 글을 선택한 뒤 버튼을 누르면 그 부분에 적용되고, 링크는 &ldquo;문서 링크&rdquo;로 고르면 주소가 알아서 들어갑니다.
      </p>

      {/* 대화상자 */}
      {dialog === "table" ? (
        <TableDialog
          onClose={() => setDialog(null)}
          onInsert={(rows, cols) => {
            const header = `| ${Array.from({ length: cols }, (_, i) => `열 ${i + 1}`).join(" | ")} |`;
            const sep = `|${Array.from({ length: cols }, () => "---").join("|")}|`;
            const body = Array.from({ length: rows }, () => `| ${Array.from({ length: cols }, () => " ").join(" | ")} |`).join("\n");
            insertBlock(`${header}\n${sep}\n${body}`, { from: 2, to: 2 + "열 1".length });
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "callout" ? (
        <CalloutDialog
          onClose={() => setDialog(null)}
          onInsert={(prefix) => {
            const sel = selectedText().trim();
            const text = sel || "내용을 입력하세요";
            const block = `> ${prefix}${text}`;
            insertBlock(block, sel ? undefined : { from: 2 + prefix.length, to: 2 + prefix.length + text.length });
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "link" ? (
        <LinkDialog
          initialText={selectedText()}
          onClose={() => setDialog(null)}
          onInsert={(text, url) => {
            insertInline(`[${text || url}](${url})`);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "doc" ? (
        <DocPickerDialog
          onClose={() => setDialog(null)}
          onPick={(d) => {
            const label = selectedText().trim() || d.title;
            insertInline(`[${label}](/docs/${d.slug})`);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "live" ? (
        <LiveBlockDialog
          onClose={() => setDialog(null)}
          onInsert={(token) => {
            insertBlock(token);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "article" ? (
        <ArticlePickerDialog
          onClose={() => setDialog(null)}
          onPick={(text, href) => {
            insertInline(`[${text}](${href})`);
            setDialog(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* ── 툴바 부품 ─────────────────────────────────────────────── */

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-1 pr-1.5 [&:not(:last-of-type)]:border-r [&:not(:last-of-type)]:border-hairline-strong">{children}</div>;
}

function Tool({ children, onClick, hint, accent = false }: { children: React.ReactNode; onClick: () => void; hint: string; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className={`h-8 rounded-[8px] px-2.5 text-[12.5px] transition-colors ${
        accent ? "bg-accent-soft font-medium text-accent hover:bg-accent-line/70" : "text-ink-2 hover:bg-black/[0.06] hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/* ── 대화상자 공용 틀 ──────────────────────────────────────── */

function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <div className="animate-fade absolute inset-0 bg-black/25 backdrop-blur-[2px]" onMouseDown={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={title} className={`animate-pop card relative w-full ${wide ? "max-w-2xl" : "max-w-md"} p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="kbd cursor-pointer hover:text-ink" aria-label="닫기">
            esc
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LiveBlockDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (token: string) => void }) {
  const [page, setPage] = useState<NinehirePage>("culture");
  const kinds = Object.keys(LIVE_KINDS) as LiveKind[];
  return (
    <Dialog title="연동 블록 넣기" onClose={onClose}>
      <p className="text-[13px] text-ink-2">
        채용 사이트(enliple.ninehire.site)의 내용을 그 자리에 자동으로 보여줍니다. 채용 사이트가 바뀌면 위키도 1시간 안에 따라 바뀝니다.
      </p>
      <ul className="mt-3 space-y-1.5">
        {kinds.map((k) => (
          <li key={k}>
            {k === "ninehire-page" ? (
              <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-hairline px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">{LIVE_KINDS[k].label}</div>
                  <div className="text-[12px] text-ink-3">{LIVE_KINDS[k].hint}</div>
                </div>
                <select value={page} onChange={(e) => setPage(e.target.value as NinehirePage)} className="input h-8! w-auto! py-0 text-[13px]" aria-label="페이지">
                  {(Object.keys(NINEHIRE_PAGES) as NinehirePage[]).map((p) => (
                    <option key={p} value={p}>
                      {NINEHIRE_PAGES[p]}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-secondary h-8 px-3 text-[12.5px]" onClick={() => onInsert(liveTokenText(k, page))}>
                  넣기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onInsert(liveTokenText(k))}
                className="flex w-full items-center gap-3 rounded-[10px] border border-hairline px-3 py-2 text-left hover:bg-accent-soft"
              >
                <span aria-hidden>🔄</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{LIVE_KINDS[k].label}</span>
                  <span className="block text-[12px] text-ink-3">{LIVE_KINDS[k].hint}</span>
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function TableDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (rows: number, cols: number) => void }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  return (
    <Dialog title="표 넣기" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="label">열(칸) 수</span>
          <input type="number" min={2} max={6} value={cols} onChange={(e) => setCols(Math.min(6, Math.max(2, Number(e.target.value) || 2)))} className="input" />
        </label>
        <label className="text-sm">
          <span className="label">줄 수 (머리글 제외)</span>
          <input type="number" min={1} max={20} value={rows} onChange={(e) => setRows(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className="input" />
        </label>
      </div>
      <p className="mt-3 text-[12px] text-ink-3">넣은 뒤 첫 줄의 &ldquo;열 1, 열 2…&rdquo;를 머리글로 바꾸고, 각 칸에 내용을 채우면 됩니다. 칸은 | 기호로 나뉩니다.</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          취소
        </button>
        <button type="button" className="btn-primary" onClick={() => onInsert(rows, cols)}>
          넣기
        </button>
      </div>
    </Dialog>
  );
}

function CalloutDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (prefix: string) => void }) {
  const [emoji, setEmoji] = useState("🎂");
  return (
    <Dialog title="콜아웃 (강조 상자) 넣기" onClose={onClose}>
      <ul className="space-y-1.5">
        {(Object.keys(CALLOUT_KINDS) as CalloutKind[]).map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => onInsert(`[!${k.toUpperCase()}] `)}
              className={`callout callout-${k} my-0! w-full cursor-pointer text-left text-[14px] transition-opacity hover:opacity-80`}
              data-emoji={CALLOUT_KINDS[k].emoji}
            >
              <p>
                <strong>{CALLOUT_KINDS[k].label}</strong> <span className="text-ink-3">· [!{k.toUpperCase()}]</span>
              </p>
            </button>
          </li>
        ))}
        <li className="callout callout-plain my-0! items-center text-[14px]" data-emoji={emoji || "🙂"}>
          <div className="flex items-center gap-2">
            <span className="font-semibold">원하는 이모지로</span>
            <input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} className="input w-16! text-center" aria-label="이모지" />
            <button type="button" className="btn-secondary h-8 px-3 text-[12.5px]" onClick={() => onInsert(`${emoji.trim() || "💡"} `)}>
              넣기
            </button>
          </div>
        </li>
      </ul>
    </Dialog>
  );
}

function LinkDialog({ initialText, onClose, onInsert }: { initialText: string; onClose: () => void; onInsert: (text: string, url: string) => void }) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState("https://");
  const valid = /^https?:\/\/\S+$/i.test(url);
  return (
    <Dialog title="외부 링크" onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="label">보이는 글자</span>
          <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="예: 네이버웍스 게시판" />
        </label>
        <label className="block text-sm">
          <span className="label">주소 (URL)</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="input font-mono text-xs" autoFocus />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onClose}>
          취소
        </button>
        <button type="button" className="btn-primary" disabled={!valid} onClick={() => onInsert(text.trim(), url.trim())}>
          넣기
        </button>
      </div>
    </Dialog>
  );
}

/* ── 문서 · 조문 선택 ──────────────────────────────────────── */

type PickDoc = { slug: string; title: string; doc_type: DocType; icon: string | null; status: string; categories: { name: string } | null };

function useDocList(onlyRules = false) {
  const [docs, setDocs] = useState<PickDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let q = supabase.from("documents").select("slug, title, doc_type, icon, status, categories(name)").neq("status", "archived").order("title");
    if (onlyRules) q = q.eq("doc_type", "rule");
    q.then(({ data, error: err }) => {
      if (cancelled) return;
      if (err) setError(err.message);
      else setDocs((data ?? []) as unknown as PickDoc[]);
    });
    return () => {
      cancelled = true;
    };
  }, [onlyRules]);
  return { docs, error };
}

function DocList({ docs, filter, onPick }: { docs: PickDoc[]; filter: string; onPick: (d: PickDoc) => void }) {
  const f = filter.trim().toLowerCase();
  const list = docs.filter((d) => !f || d.title.toLowerCase().includes(f) || d.slug.includes(f) || (d.categories?.name ?? "").includes(f));
  if (list.length === 0) return <p className="px-2 py-6 text-center text-[13px] text-ink-3">일치하는 문서가 없습니다.</p>;
  return (
    <ul className="max-h-[50vh] overflow-y-auto">
      {list.map((d) => (
        <li key={d.slug}>
          <button
            type="button"
            onClick={() => onPick(d)}
            className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left hover:bg-accent-soft"
          >
            <span aria-hidden className="w-6 text-center text-[16px] leading-none">
              {docIcon(d.icon, d.doc_type)}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{d.title}</span>
            <span className="shrink-0 text-[11.5px] text-ink-3">
              {d.categories?.name ?? ""} · {DOC_TYPES[d.doc_type] ?? d.doc_type}
              {d.status !== "published" ? " · 작성 중" : ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DocPickerDialog({ onClose, onPick }: { onClose: () => void; onPick: (d: PickDoc) => void }) {
  const { docs, error } = useDocList();
  const [filter, setFilter] = useState("");
  return (
    <Dialog title="문서 링크 — 연결할 문서를 고르세요" onClose={onClose} wide>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} className="input mb-2" placeholder="제목으로 찾기 (예: 연차, 식권)" autoFocus />
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      {docs ? <DocList docs={docs} filter={filter} onPick={onPick} /> : <p className="px-2 py-6 text-center text-[13px] text-ink-3">불러오는 중…</p>}
    </Dialog>
  );
}

function ArticlePickerDialog({ onClose, onPick }: { onClose: () => void; onPick: (text: string, href: string) => void }) {
  const { docs, error } = useDocList(true);
  const [filter, setFilter] = useState("");
  const [rule, setRule] = useState<PickDoc | null>(null);
  const [toc, setToc] = useState<ReturnType<typeof extractToc> | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!rule) return;
    let cancelled = false;
    setToc(null);
    createClient()
      .from("documents")
      .select("body_md")
      .eq("slug", rule.slug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setToc(extractToc((data as { body_md: string | null } | null)?.body_md ?? ""));
      });
    return () => {
      cancelled = true;
    };
  }, [rule]);

  const items = (toc ?? []).filter((t) => !q.trim() || t.text.includes(q.trim()));

  return (
    <Dialog title={rule ? `조문 링크 — ${rule.title}` : "조문 링크 — 먼저 규정을 고르세요"} onClose={onClose} wide>
      {!rule ? (
        <>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} className="input mb-2" placeholder="규정 이름으로 찾기" autoFocus />
          {error ? <p className="text-[13px] text-danger">{error}</p> : null}
          {docs ? <DocList docs={docs} filter={filter} onPick={setRule} /> : <p className="px-2 py-6 text-center text-[13px] text-ink-3">불러오는 중…</p>}
        </>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2">
            <button type="button" className="btn-ghost h-8 px-2.5 text-[12.5px]" onClick={() => setRule(null)}>
              ← 다른 규정
            </button>
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="조문 찾기 (예: 93, 건강진단)" autoFocus />
          </div>
          {toc === null ? (
            <p className="px-2 py-6 text-center text-[13px] text-ink-3">조문을 읽는 중…</p>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-[13px] text-ink-3">일치하는 조문이 없습니다.</p>
          ) : (
            <ul className="max-h-[50vh] overflow-y-auto">
              {items.map((t) => {
                const label = t.text.replace(/\s+/g, " ").replace(/제\s*(\d+)\s*조/, "제$1조").replace(/\[/g, "(").replace(/\]/g, ")");
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onPick(`${rule.title} ${label}`, `/docs/${rule.slug}#${t.id}`)}
                      className={`flex w-full items-center rounded-[10px] py-1.5 pr-2 text-left text-[14px] hover:bg-accent-soft ${t.depth === 3 ? "pl-7" : "pl-2.5 font-semibold"}`}
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Dialog>
  );
}
