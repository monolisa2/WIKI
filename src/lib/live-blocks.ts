/**
 * 연동 블록: 본문 마크다운에 한 줄로 `[[live:종류]]` 또는 `[[live:종류:인자]]` 를 쓰면
 * 문서 화면에서 그 자리에 채용 사이트(enliple.ninehire.site)의 최신 내용이 들어간다.
 * 서버가 가져와 1시간 캐시하므로 채용 사이트가 바뀌면 위키도 따라 바뀐다.
 *
 *   [[live:ninehire-letter]]        열일레터 목록 (Insights > Letter)
 *   [[live:ninehire-news]]          뉴스 목록 (Insights > News)
 *   [[live:ninehire-positions]]     채용 중인 포지션 표 (Career)
 *   [[live:ninehire-page:culture]]  페이지 본문 (culture · mobon · mobi · mobsoft · mobwith · anick · process · home)
 */
export const LIVE_KINDS = {
  "ninehire-letter": { label: "열일레터 목록", hint: "채용 사이트 Insights > Letter 의 월별 열일레터 링크" },
  "ninehire-news": { label: "뉴스 목록", hint: "채용 사이트 Insights > News 의 보도 목록" },
  "ninehire-positions": { label: "채용 중인 포지션", hint: "채용 사이트 Career 의 진행 중 공고 표" },
  "ninehire-page": { label: "채용 사이트 페이지 본문", hint: "회사 소개·계열사·조직문화 페이지의 글을 그대로 가져옴" },
} as const;
export type LiveKind = keyof typeof LIVE_KINDS;

/** `ninehire-page` 의 인자로 쓸 수 있는 페이지 (채용 사이트 주소의 마지막 부분) */
export const NINEHIRE_PAGES = {
  home: "회사 소개 (첫 화면)",
  culture: "Culture (일하는 방식·복지)",
  mobon: "MOBON 모비온",
  mobi: "MOB-i 모비아이",
  mobsoft: "MOBSOFT 모비소프트",
  mobwith: "MOBWITH 모비위드",
  anick: "ANICK 에이닉",
  process: "채용 절차",
} as const;
export type NinehirePage = keyof typeof NINEHIRE_PAGES;

export type LiveToken = { kind: LiveKind; arg: string | null; raw: string };
export type BodySegment = { type: "md"; text: string } | ({ type: "live" } & LiveToken);

const LINE = /^\s*\[\[live:([a-z-]+)(?::([a-z0-9-]+))?\]\]\s*$/;

export function parseLiveLine(line: string): LiveToken | null {
  const m = LINE.exec(line);
  if (!m) return null;
  const kind = m[1];
  if (!(kind in LIVE_KINDS)) return null;
  return { kind: kind as LiveKind, arg: m[2] ?? null, raw: line.trim() };
}

/** 본문을 마크다운 조각과 연동 블록으로 나눈다. 코드 펜스 안의 토큰은 무시한다. */
export function splitLiveBlocks(bodyMd: string): BodySegment[] {
  const out: BodySegment[] = [];
  let buf: string[] = [];
  let inFence = false;
  const flush = () => {
    const text = buf.join("\n");
    if (text.trim()) out.push({ type: "md", text });
    buf = [];
  };
  for (const line of bodyMd.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line.trim())) inFence = !inFence;
    const token = inFence ? null : parseLiveLine(line);
    if (token) {
      flush();
      out.push({ type: "live", ...token });
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

export function liveTokenText(kind: LiveKind, arg?: string | null) {
  return arg ? `[[live:${kind}:${arg}]]` : `[[live:${kind}]]`;
}

export function liveLabel(kind: LiveKind, arg: string | null) {
  if (kind === "ninehire-page") {
    const name = arg && arg in NINEHIRE_PAGES ? NINEHIRE_PAGES[arg as NinehirePage] : arg ?? "(페이지 미지정)";
    return `채용 사이트 페이지 · ${name}`;
  }
  return LIVE_KINDS[kind].label;
}
