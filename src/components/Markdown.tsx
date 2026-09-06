import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import remarkCallouts from "@/lib/remark-callouts";
import { liveLabel, splitLiveBlocks } from "@/lib/live-blocks";

const DOC_LINK = /^\/docs\/([^#?/]+)/;

/**
 * 마크다운 렌더러. 서버 컴포넌트에서 그대로 쓰고(문서 화면: 클라이언트 JS 없음), 편집기 미리보기에서는 클라이언트로 번들된다.
 * - `[[live:…]]` 줄은 여기서는 자리표시 칩으로만 보인다 (실제 내용은 서버의 DocBody 가 그린다). 편집기 미리보기용.
 * - missingSlugs: 아직 공개되지 않은 문서 slug. 그 문서로 가는 링크는 "준비 중" 표시로 바꾼다.
 * - bare: 바깥에서 prose-wiki 를 이미 씌운 경우 (DocBody).
 */
export function Markdown({
  children,
  className = "",
  bare = false,
  missingSlugs = [],
}: {
  children: string;
  className?: string;
  bare?: boolean;
  missingSlugs?: string[];
}) {
  const missing = new Set(missingSlugs);
  const segments = splitLiveBlocks(children);
  const body = segments.map((seg, i) =>
    seg.type === "live" ? (
      <div key={i} className="callout callout-plain" data-emoji="🔄" role="note">
        <p>
          <strong>연동 블록 · {liveLabel(seg.kind, seg.arg)}</strong>
          <br />
          <span className="text-[13px] text-ink-3">저장하면 문서 화면에서 채용 사이트의 최신 내용이 이 자리에 표시됩니다. ({seg.raw})</span>
        </p>
      </div>
    ) : (
      <ReactMarkdown
        key={i}
        remarkPlugins={[remarkGfm, remarkCallouts]}
        rehypePlugins={[rehypeSlug]}
        components={{
          // 표는 스크롤 상자로 감싼다. table 자체를 display:block 으로 두면 배경·테두리가 내용 폭만큼만 그려져 잘린 것처럼 보인다.
          table: ({ children: c }) => (
            <div className="table-wrap">
              <table>{c}</table>
            </div>
          ),
          a: ({ href, children: c }) => {
            const m = href ? DOC_LINK.exec(href) : null;
            if (m && missing.has(decodeURIComponent(m[1]))) {
              return (
                <span className="text-ink-2" title="아직 공개되지 않은 문서입니다">
                  {c}
                  <span className="ml-1 rounded-full bg-black/[0.06] px-1.5 py-px align-middle text-[11px] text-ink-3">준비 중</span>
                </span>
              );
            }
            return (
              <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {c}
              </a>
            );
          },
        }}
      >
        {seg.text}
      </ReactMarkdown>
    ),
  );
  return bare ? <>{body}</> : <div className={`prose-wiki ${className}`}>{body}</div>;
}
