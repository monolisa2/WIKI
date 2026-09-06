import { Suspense } from "react";
import { Markdown } from "@/components/Markdown";
import { LiveBlock } from "@/components/doc/LiveBlock";
import { splitLiveBlocks } from "@/lib/live-blocks";

/**
 * 문서 본문: 마크다운 조각은 Markdown 으로, `[[live:…]]` 줄은 연동 블록으로 그린다.
 * missingSlugs 에 든 문서로 가는 링크는 "준비 중" 표시로 바뀐다 (아직 공개되지 않은 문서).
 * 연동 블록은 Suspense 로 감싸 본문이 먼저 뜨고 채용 사이트 내용은 뒤따라 채워진다 (스트리밍).
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
          <Suspense key={i} fallback={<LiveSkeleton />}>
            <LiveBlock kind={seg.kind} arg={seg.arg} />
          </Suspense>
        ),
      )}
    </div>
  );
}

function LiveSkeleton() {
  return (
    <div aria-busy="true" aria-label="채용 사이트 내용을 불러오는 중" className="live-block my-6 animate-pulse">
      <div className="h-5 w-2/5 rounded-md bg-black/[0.06]" />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-[12px] bg-black/[0.05]" />
        <div className="h-24 rounded-[12px] bg-black/[0.05]" />
        <div className="h-24 rounded-[12px] bg-black/[0.05]" />
      </div>
      <div className="mt-3 h-3 w-1/3 rounded bg-black/[0.05]" />
    </div>
  );
}
