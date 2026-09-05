import type { Root, Blockquote, Paragraph, Text } from "mdast";

/**
 * 노션형 콜아웃 블록.
 *
 *   > [!NOTE] 안내        💡 파란 배경
 *   > [!TIP] 확인         ✅ 초록 배경
 *   > [!IMPORTANT] 중요   ❗ 보라 배경
 *   > [!WARNING] 주의     ⚠️ 노란 배경
 *   > [!CAUTION] 금지     🚫 빨간 배경
 *   > 🎂 이모지로 시작하는 인용   → 그 이모지를 아이콘으로 쓰는 기본(연노랑) 콜아웃
 *
 * 마커가 없는 인용문은 그대로 인용문으로 렌더된다.
 */
export const CALLOUT_KINDS = {
  note: { emoji: "💡", label: "안내" },
  tip: { emoji: "✅", label: "확인" },
  important: { emoji: "❗", label: "중요" },
  warning: { emoji: "⚠️", label: "주의" },
  caution: { emoji: "🚫", label: "금지" },
} as const;
export type CalloutKind = keyof typeof CALLOUT_KINDS;

const MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
// 이모지(확장 그림문자)로 시작하고, 뒤에 공백이 오는 경우
const EMOJI_LEAD = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)\s+/u;

function firstTextNode(bq: Blockquote): { para: Paragraph; text: Text } | null {
  const para = bq.children[0];
  if (!para || para.type !== "paragraph") return null;
  const text = para.children[0];
  if (!text || text.type !== "text") return null;
  return { para, text };
}

function decorate(bq: Blockquote, kind: string, emoji: string) {
  const data = (bq.data ??= {}) as { hName?: string; hProperties?: Record<string, unknown> };
  data.hName = "aside";
  data.hProperties = { className: ["callout", `callout-${kind}`], "data-emoji": emoji, role: "note" };
}

export default function remarkCallouts() {
  return (tree: Root) => {
    const walk = (node: { type: string; children?: unknown[] }) => {
      if (node.type === "blockquote") {
        const bq = node as Blockquote;
        const hit = firstTextNode(bq);
        if (hit) {
          const m = MARKER.exec(hit.text.value);
          if (m) {
            const kind = m[1].toLowerCase() as CalloutKind;
            hit.text.value = hit.text.value.slice(m[0].length);
            if (!hit.text.value && hit.para.children.length === 1) bq.children.shift();
            decorate(bq, kind, CALLOUT_KINDS[kind].emoji);
          } else {
            const e = EMOJI_LEAD.exec(hit.text.value);
            if (e) {
              hit.text.value = hit.text.value.slice(e[0].length);
              decorate(bq, "plain", e[1]);
            }
          }
        }
      }
      for (const child of node.children ?? []) walk(child as { type: string; children?: unknown[] });
    };
    walk(tree);
  };
}
