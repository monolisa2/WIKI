/**
 * 연동 블록: 본문 마크다운에 한 줄로 `[[live:종류]]` 또는 `[[live:종류:인자]]` 를 쓰면
 * 문서 화면에서 그 자리에 채용 사이트(enliple.ninehire.site)의 최신 내용이 들어간다.
 * 서버가 가져와 1시간 캐시하므로 채용 사이트가 바뀌면 위키도 따라 바뀐다.
 *
 *   [[live:ninehire-letter]]        열일레터 목록 (Insights > Letter)
 *   [[live:ninehire-news]]          뉴스 목록 (Insights > News)
 *   [[live:ninehire-positions]]     채용 중인 포지션 표 (Career)
 *   [[live:ninehire-page:culture]]  페이지 본문 (culture · mobon · mobi · mobsoft · mobwith · anick · process · home)
 *   [[live:ninehire-page:culture@0-1]]  그 페이지의 0~1번 섹션만 (채용용 복지 홍보 등 위키에 맞지 않는 부분을 뺄 때)
 *   [[live:ninehire-tabs:mobon,mobi,mobwith,mobsoft,anick]]  여러 페이지를 탭으로
 *   [[live:embed:approval-kiosk]]   위키가 직접 서빙하는 사내 도구 페이지(public/tools/*)를 끼워 넣기
 */
export const LIVE_KINDS = {
  "ninehire-letter": { label: "열일레터 목록", hint: "채용 사이트 Insights > Letter 의 월별 열일레터 링크" },
  "ninehire-news": { label: "뉴스 목록", hint: "채용 사이트 Insights > News 의 보도 목록" },
  "ninehire-positions": { label: "채용 중인 포지션", hint: "채용 사이트 Career 의 진행 중 공고 표" },
  "ninehire-page": { label: "채용 사이트 페이지", hint: "회사 소개·계열사·조직문화 페이지를 이미지·배치 그대로 가져옴" },
  "ninehire-tabs": { label: "채용 사이트 페이지 (탭)", hint: "여러 페이지를 탭으로 넘겨 보기. 기본: 모비온·모비아이·모비위드·모비소프트·에이닉" },
  embed: { label: "사내 도구 끼워 넣기", hint: "위임전결 기준표 빠른 조회 등 위키에 올려 둔 도구 페이지를 문서 안에 표시" },
} as const;

/** `embed` 인자로 쓸 수 있는 도구. 파일은 public/tools/ 에 두며 로그인한 사용자만 열 수 있다(미들웨어가 .html 도 보호). */
export const EMBEDS = {
  "approval-kiosk": { src: "/tools/approval-kiosk.html", title: "위임전결 기준표 빠른 조회", height: 1180 },
} as const;
export type EmbedKey = keyof typeof EMBEDS;
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

const LINE = /^\s*\[\[live:([a-z-]+)(?::([a-z0-9,@-]+))?\]\]\s*$/;

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

export const DEFAULT_TAB_PAGES: NinehirePage[] = ["mobon", "mobi", "mobwith", "mobsoft", "anick"];
/** `ninehire-tabs` 인자(쉼표 구분)를 페이지 목록으로. 모르는 값은 버리고, 비어 있으면 기본 목록 */
export function tabPages(arg: string | null): NinehirePage[] {
  const list = (arg ?? "").split(",").map((s) => s.trim()).filter((s): s is NinehirePage => s in NINEHIRE_PAGES);
  return list.length ? list : DEFAULT_TAB_PAGES;
}
/** 탭 이름: "MOBON 모비온" → "모비온" 처럼 한글만 짧게 */
export function pageShortLabel(page: NinehirePage) {
  const full = NINEHIRE_PAGES[page];
  const m = /^[A-Za-z-]+\s+(.+)$/.exec(full);
  return (m ? m[1] : full).replace(/\s*\(.*\)$/, "");
}

/** `culture@0-1` → { page: "culture", range: [0, 1] }. 범위가 없으면 전체 */
export function parsePageArg(arg: string | null): { page: string; range: [number, number] | null } {
  const [page = "", rangeText] = (arg ?? "").split("@");
  const m = rangeText ? /^(\d+)(?:-(\d+))?$/.exec(rangeText) : null;
  return { page, range: m ? [Number(m[1]), Number(m[2] ?? m[1])] : null };
}

export function liveLabel(kind: LiveKind, arg: string | null) {
  if (kind === "embed") return `사내 도구 · ${arg && arg in EMBEDS ? EMBEDS[arg as EmbedKey].title : arg ?? "(도구 미지정)"}`;
  if (kind === "ninehire-tabs") return `채용 사이트 페이지 탭 · ${tabPages(arg).map(pageShortLabel).join(" · ")}`;
  if (kind === "ninehire-page") {
    const { page } = parsePageArg(arg);
    const name = page && page in NINEHIRE_PAGES ? NINEHIRE_PAGES[page as NinehirePage] : page || "(페이지 미지정)";
    return `채용 사이트 페이지 · ${name}`;
  }
  return LIVE_KINDS[kind].label;
}
