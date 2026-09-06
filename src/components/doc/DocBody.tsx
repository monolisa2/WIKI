import { Markdown } from "@/components/Markdown";
import { LiveBlock } from "@/components/doc/LiveBlock";
import { splitLiveBlocks } from "@/lib/live-blocks";

/**
 * 문서 본문: 마크다운 조각은 Markdown 으로, `[[live:…]]` 줄은 연동 블록으로 그린다.
 * missingSlugs 에 든 문서로 가는 링크는 "준비 중" 표시로 바뀐다 (아직 공개되지 않은 문서).
 */
export function DocBody({ bodyMd, missingSlugs = [] }: { bodyMd: string; missingSlugs?: string[] }) {
  const segments = splitLiveBlocks(bodyMd);
  return (
    <div className="prose-wiki">
      {segments.map((seg, i) =>
        seg.type === "md" ? (
          <Markdown key={i} bare missingSlugs={missingSlugs}>
            {seg.text}
          </Markdown>
        ) : (
          <LiveBlock key={i} kind={seg.kind} arg={seg.arg} />
        ),
      )}
    </div>
  );
}
