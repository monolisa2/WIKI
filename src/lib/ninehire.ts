import { NINEHIRE_PAGES } from "./live-blocks";

/**
 * 채용 사이트(나인하이어) 읽기. 로그인 없이 공개된 것만 쓴다.
 *  - 페이지 본문: HTML 안의 __NEXT_DATA__ JSON (homepage.pages[].sections[].layouts[].columns[].blocks[])
 *  - 채용 공고: 공개 API identity-access/homepage/recruitments
 * fetch 결과는 Next 데이터 캐시에 1시간 보관된다 (채용 사이트가 바뀌면 최대 1시간 뒤 반영).
 */
export const NINEHIRE_SITE = "https://enliple.ninehire.site";
const API = "https://api.ninehire.com";
const COMPANY_ID = "132fe4a0-5969-11f1-883b-7f3517c8d898";
export const NINEHIRE_REVALIDATE = 60 * 60;

export function ninehirePageUrl(page: string) {
  return page === "home" ? `${NINEHIRE_SITE}/` : `${NINEHIRE_SITE}/${page}`;
}

/* ── HTML 조각 → 글 ──────────────────────────────────────────── */

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  middot: "·", hellip: "…", ndash: "–", mdash: "—", bull: "•", rarr: "→", zwj: "\u200d", zwnj: "\u200c",
};
function decodeEntities(s: string) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}
/** 태그를 걷어내고 줄바꿈만 남긴다. */
export function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
      .replace(/<li[^>]*>/gi, "• ")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[​⁠﻿]/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// 자리표시 문자 (사용자 영역 코드포인트라 본문에 나올 일이 없다)
const PH_BR = "", PH_B = "", PH_BE = "", PH_I = "", PH_IE = "";
/**
 * 문단 안쪽 HTML 을 안전한 최소 마크업(<strong> <em> <br>)만 남긴 HTML 로 바꾼다.
 * 태그를 먼저 자리표시로 바꾸고, 엔티티를 풀고, 전부 이스케이프한 뒤 자리표시만 태그로 되돌리므로 원문의 다른 태그·속성은 남지 않는다.
 */
function safeInlineHtml(inner: string) {
  const s = inner
    .replace(/<br\s*\/?>/gi, PH_BR)
    .replace(/<\/(strong|b)\b[^>]*>/gi, PH_BE)
    .replace(/<(strong|b)\b[^>]*>/gi, PH_B)
    .replace(/<\/(em|i)\b[^>]*>/gi, PH_IE)
    .replace(/<(em|i)\b[^>]*>/gi, PH_I)
    .replace(/<[^>]+>/g, "");
  const text = escapeHtml(decodeEntities(s).replace(/[​⁠﻿]/g, "").replace(/ /g, " "));
  return text
    .split(PH_BR).join("<br>")
    .split(PH_B).join("<strong>")
    .split(PH_BE).join("</strong>")
    .split(PH_I).join("<em>")
    .split(PH_IE).join("</em>")
    .replace(/^(\s|<br>)+|(\s|<br>)+$/g, "")
    .trim();
}

/* ── 페이지 구조 ─────────────────────────────────────────────── */

export type NhAlign = "left" | "center" | "right";
/** 문단 하나: 안전한 인라인 HTML + 원문 글자 크기(px) + 정렬 */
export type NhPara = { html: string; size: number; align: NhAlign; heading: boolean };
export type NhBlock =
  | { kind: "text"; paras: NhPara[] }
  | { kind: "image"; src: string; size: number; align: NhAlign; href: string | null }
  | { kind: "link"; text: string; href: string }
  | { kind: "cards"; items: { title: string; href: string | null; image: string | null }[] };
/** 나인하이어의 레이아웃(행) 하나 = 열 여러 개, 열마다 블록 목록 */
export type NhLayout = { columns: NhBlock[][] };
export type NhSection = { layouts: NhLayout[] };
export type NhPage = { title: string; url: string; pageUrl: string; sections: NhSection[] };

type RawLink = { linkType?: string; url?: string | null } | null | undefined;
type RawBlock = {
  type?: string;
  text?: string | null;
  link?: RawLink;
  imageFileKey?: string | null;
  size?: number | null;
  layout?: string | null;
  slides?: { title?: string | null; description?: string | null; imageFileKey?: string | null; link?: RawLink }[];
};
type RawPage = { title?: string; pageUrl?: string; sections?: { layouts?: { columns?: { blocks?: RawBlock[] }[] }[] }[] };

function linkUrl(l: RawLink) {
  return l && l.linkType === "url" && l.url ? l.url : null;
}
function imageUrl(key: string | null | undefined) {
  return key ? `https://image.ninehire.com/${key}` : null;
}
function alignOf(style: string | undefined, fallback: NhAlign = "left"): NhAlign {
  const m = /text-align:\s*(left|center|right)/i.exec(style ?? "");
  return (m?.[1].toLowerCase() as NhAlign | undefined) ?? fallback;
}
function sizeOf(html: string, fallback = 16) {
  const sizes = Array.from(html.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/gi)).map((m) => Number(m[1]));
  return sizes.length ? Math.max(...sizes) : fallback;
}

/** 글 블록 HTML → 문단 목록. 문단(p·h)마다 자기 글자 크기·정렬을 가진다. */
export function parseTextBlock(html: string): NhPara[] {
  const out: NhPara[] = [];
  const re = /<(p|h[1-6]|li)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let matched = false;
  while ((m = re.exec(html))) {
    matched = true;
    const inner = safeInlineHtml(m[3]);
    if (!inner.replace(/<br>/g, "").trim()) continue;
    const size = sizeOf(m[2] + m[3]);
    out.push({ html: inner, size, align: alignOf(m[2]), heading: /^h/i.test(m[1]) || size >= 24 });
  }
  if (!matched) {
    const inner = safeInlineHtml(html);
    if (inner) out.push({ html: inner, size: sizeOf(html), align: alignOf(html), heading: sizeOf(html) >= 24 });
  }
  return out;
}

function convertBlock(b: RawBlock): NhBlock | null {
  switch (b.type) {
    case "text": {
      if (!b.text) return null;
      const paras = parseTextBlock(b.text);
      return paras.length ? { kind: "text", paras } : null;
    }
    case "image": {
      const src = imageUrl(b.imageFileKey);
      if (!src) return null;
      const layout = (b.layout ?? "center") as NhAlign;
      return {
        kind: "image",
        src,
        size: Math.min(100, Math.max(10, Number(b.size) || 100)),
        align: ["left", "center", "right"].includes(layout) ? layout : "center",
        href: linkUrl(b.link),
      };
    }
    case "button": {
      const href = linkUrl(b.link);
      return href ? { kind: "link", text: htmlToText(b.text ?? "") || "자세히 보기", href } : null;
    }
    case "slide": {
      const items = (b.slides ?? [])
        .map((s) => ({ title: htmlToText(s.description ?? s.title ?? ""), href: linkUrl(s.link), image: imageUrl(s.imageFileKey) }))
        .filter((s) => s.title || s.href);
      return items.length ? { kind: "cards", items } : null;
    }
    default:
      return null; // blank · divider 는 뺀다 (간격은 위키 쪽 스타일로)
  }
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: { accept: "text/html", "user-agent": "enliple-wiki/1.0 (+https://enliple-wiki.vercel.app)" },
    next: { revalidate: NINEHIRE_REVALIDATE },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`ninehire ${res.status}`);
  return res.text();
}

async function fetchHomepagePages(): Promise<RawPage[]> {
  const html = await fetchHtml(`${NINEHIRE_SITE}/`);
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error("ninehire: __NEXT_DATA__ 없음");
  const data = JSON.parse(m[1]) as { props?: { pageProps?: { homepageProps?: { homepage?: { pages?: RawPage[] } } } } };
  return data.props?.pageProps?.homepageProps?.homepage?.pages ?? [];
}

/** 문서에서 직접 고를 수 있는 페이지 + 목록 블록이 내부적으로 읽는 페이지 */
const READABLE_PAGES = new Set<string>([...Object.keys(NINEHIRE_PAGES), "letter", "news"]);

/** 채용 사이트 페이지 하나를 구조(섹션 → 행 → 열 → 블록) 그대로. 없거나 실패하면 null. */
export async function getNinehirePage(page: string): Promise<NhPage | null> {
  if (!READABLE_PAGES.has(page)) return null;
  try {
    const pages = await fetchHomepagePages();
    const raw = pages.find((p) => p.pageUrl === page);
    if (!raw) return null;
    const sections: NhSection[] = (raw.sections ?? [])
      .map((s) => ({
        layouts: (s.layouts ?? [])
          .map((l) => ({ columns: (l.columns ?? []).map((c) => (c.blocks ?? []).map(convertBlock).filter((b): b is NhBlock => b !== null)) }))
          .filter((l) => l.columns.some((c) => c.length > 0)),
      }))
      .filter((s) => s.layouts.length > 0);
    return { title: raw.title ?? (NINEHIRE_PAGES as Record<string, string>)[page] ?? page, url: ninehirePageUrl(page), pageUrl: page, sections };
  } catch {
    return null;
  }
}

/** 페이지의 블록을 문서 순서대로 평탄화 (목록형 블록용) */
function flatBlocks(page: NhPage): NhBlock[] {
  return page.sections.flatMap((s) => s.layouts.flatMap((l) => l.columns.flat()));
}

/* ── 열일레터 · 뉴스 ─────────────────────────────────────────── */

export type NhLetter = { title: string; href: string; image: string | null };
export async function getNinehireLetters(): Promise<NhLetter[] | null> {
  const page = await getNinehirePage("letter");
  if (!page) return null;
  const cards = flatBlocks(page).find((b): b is Extract<NhBlock, { kind: "cards" }> => b.kind === "cards");
  return (cards?.items ?? []).filter((i) => i.href).map((i) => ({ title: i.title, href: i.href as string, image: i.image }));
}

export type NhNews = { title: string; meta: string | null; href: string | null };
export async function getNinehireNews(): Promise<NhNews[] | null> {
  const page = await getNinehirePage("news");
  if (!page) return null;
  const items: NhNews[] = [];
  let cur: NhNews | null = null;
  for (const b of flatBlocks(page)) {
    if (b.kind === "text") {
      // 한 글 블록 안의 제목 문단(큰 글자)들은 줄바꿈된 한 제목으로 합친다
      const title = b.paras.filter((p) => p.heading).map((p) => htmlToText(p.html).replace(/\n/g, " ")).filter(Boolean).join(" ");
      const meta = b.paras.filter((p) => !p.heading).map((p) => htmlToText(p.html).replace(/\n/g, " ")).filter(Boolean).join(" ");
      if (title) {
        if (cur) items.push(cur);
        cur = { title, meta: meta || null, href: null };
      } else if (meta) {
        if (!cur) cur = { title: meta, meta: null, href: null };
        else cur.meta = cur.meta ? `${cur.meta} ${meta}` : meta;
      }
    } else if (b.kind === "link" && cur) {
      cur.href = b.href;
      items.push(cur);
      cur = null;
    }
  }
  if (cur) items.push(cur);
  return items;
}

/* ── 채용 공고 ───────────────────────────────────────────────── */

export type NhPosition = {
  key: string;
  title: string;
  company: string;
  jobGroup: string;
  career: string;
  employment: string;
  href: string;
  createdAt: string;
  isPool: boolean;
};
type RawRecruitment = {
  addressKey: string;
  status: string;
  externalTitle: string;
  employmentType: string[];
  career: { type: string; range?: { over?: number; below?: number } | null } | null;
  jobGroup: { title: string } | null;
  jobTask: { title: string } | null;
  affiliation: { title: string } | null;
  createdAt: string;
};
const EMPLOYMENT: Record<string, string> = { full_time: "정규직", contractor: "계약직", intern: "인턴", part_time: "파트타임", freelancer: "프리랜서" };

function careerText(c: RawRecruitment["career"]) {
  if (!c) return "-";
  if (c.type === "irrelevant") return "경력 무관";
  if (c.type === "newcomer") return "신입";
  const over = c.range?.over;
  const below = c.range?.below;
  let t = over ? `${over}년 이상` : "경력";
  if (below) t += ` ${below}년 이하`;
  return t;
}
function employmentText(types: string[]) {
  const set = new Set(types);
  if (set.has("full_time") && set.has("contractor")) return "정규직 (3개월 계약 후 전환 평가)";
  if (set.size === 1 && set.has("contractor")) return "계약직 (정규직 전환형)";
  return types.map((t) => EMPLOYMENT[t] ?? t).join(", ") || "-";
}

export async function getNinehirePositions(): Promise<NhPosition[] | null> {
  try {
    const res = await fetch(`${API}/identity-access/homepage/recruitments?companyId=${COMPANY_ID}&page=1&countPerPage=50`, {
      headers: { accept: "application/json", origin: NINEHIRE_SITE, referer: `${NINEHIRE_SITE}/career` },
      next: { revalidate: NINEHIRE_REVALIDATE },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: RawRecruitment[] };
    const order: Record<string, number> = { 인라이플: 0, 모비소프트: 1, 모비위드: 2, 에이닉: 3 };
    return (data.results ?? [])
      .filter((r) => r.status === "in_progress")
      .map((r) => {
        const m = /^\[([^\]]+)\]\s*(.*)$/.exec(r.externalTitle);
        const isPool = !r.affiliation && !r.jobGroup;
        const company = m ? m[1] : r.affiliation?.title ?? (isPool ? "전체" : "-");
        const group = r.jobGroup?.title ?? "-";
        const task = r.jobTask?.title;
        return {
          key: r.addressKey,
          title: (m ? m[2] : r.externalTitle).trim(),
          company,
          jobGroup: task && task !== group ? `${group} · ${task}` : group,
          career: careerText(r.career),
          employment: employmentText(r.employmentType),
          href: `${NINEHIRE_SITE}/job_posting/${r.addressKey}`,
          createdAt: r.createdAt,
          isPool,
        };
      })
      .sort((a, b) => Number(a.isPool) - Number(b.isPool) || (order[a.company] ?? 9) - (order[b.company] ?? 9) || b.createdAt.localeCompare(a.createdAt));
  } catch {
    return null;
  }
}
