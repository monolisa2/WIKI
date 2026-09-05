import GithubSlugger from "github-slugger";

export type TocItem = { id: string; text: string; depth: 2 | 3 };

/** 마크다운 인라인 문법을 걷어내고 제목의 표시 텍스트만 남긴다 (rehype-slug 가 보는 textContent 와 맞추기 위함). */
function plainText(md: string) {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

/**
 * 본문 마크다운의 h2·h3 를 목차 항목으로 추출한다.
 * id 는 본문 렌더링(rehype-slug → github-slugger)과 같은 규칙으로 만들어 앵커가 일치한다.
 */
export function extractToc(bodyMd: string | null | undefined): TocItem[] {
  if (!bodyMd) return [];
  const slugger = new GithubSlugger();
  const items: TocItem[] = [];
  let inFence = false;
  for (const raw of bodyMd.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^(```|~~~)/.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,4})\s+(.+)$/.exec(line);
    if (!m) continue;
    const depth = m[1].length;
    const text = plainText(m[2]);
    // rehype-slug 는 모든 제목(h1~h6)에 id 를 매기므로, 중복 카운트를 맞추려면 h1·h4 도 slugger 에 통과시킨다.
    const id = slugger.slug(text);
    if (depth === 2 || depth === 3) items.push({ id, text, depth });
  }
  return items;
}
