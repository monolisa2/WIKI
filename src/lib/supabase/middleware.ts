import { createServerClient, stringFromBase64URL } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PUBLIC_PREFIXES = ["/login", "/auth"];

/**
 * auth 서버 호출 한 건의 상한.
 * auth-js 는 네트워크 실패를 최대 30초(AUTO_REFRESH_TICK_DURATION_MS)까지
 * 지수 백오프로 재시도하므로, 아래 전체 마감시한이 반드시 함께 있어야 한다.
 */
const AUTH_FETCH_TIMEOUT_MS = 2000;

/** getUser() 전체(내부 재시도 포함)의 마감시한. Vercel 미들웨어 예산 25s 보다 훨씬 짧게. */
const AUTH_DEADLINE_MS = 3000;

/** 만료 이 시간 전부터만 auth 서버에 갱신을 요청한다. 그 전에는 네트워크 호출이 아예 없다. */
const REFRESH_LEAD_MS = 2 * 60 * 1000;

const AUTH_COOKIE = /^sb-.+-auth-token(\.(\d+))?$/;

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** 호출자 signal 을 유지하면서 타임아웃을 덧씌운 fetch */
function withTimeout(ms: number): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(ms);
    // AbortSignal.any 가 없는 런타임에서도 타임아웃만은 동작하게 한다.
    const signal =
      init?.signal && typeof AbortSignal.any === "function" ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}

/** 어떤 이유로든 ms 안에 끝나지 않으면 포기한다 */
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("auth deadline")), ms);
  });
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/** 인증 실패가 아니라 auth 서버에 닿지 못한 경우인지 */
function isTransientAuthError(error: { name?: string; status?: number | null }) {
  if (error.name === "AuthRetryableFetchError") return true;
  const status = error.status;
  return status == null || status === 0 || status === 429 || status >= 500;
}

/**
 * 세션 쿠키를 네트워크 없이 로컬에서 읽는다.
 * 서명은 검증하지 않는다 — 라우팅 판단에만 쓰고, 실제 데이터는 PostgREST 가
 * 매 질의마다 토큰을 검증하므로(RLS) 위조 토큰으로는 아무 행도 읽히지 않는다.
 */
function readSessionCookie(request: NextRequest): { expiresAt: number | null } | null {
  const chunks: { index: number; value: string }[] = [];
  for (const cookie of request.cookies.getAll()) {
    const m = AUTH_COOKIE.exec(cookie.name);
    if (m) chunks.push({ index: m[2] ? Number(m[2]) : 0, value: cookie.value });
  }
  if (chunks.length === 0) return null;

  let raw = chunks
    .sort((a, b) => a.index - b.index)
    .map((c) => c.value)
    .join("");
  try {
    if (raw.startsWith("base64-")) raw = stringFromBase64URL(raw.slice("base64-".length));
    const session = JSON.parse(raw) as { expires_at?: number };
    return { expiresAt: typeof session.expires_at === "number" ? session.expires_at : null };
  } catch {
    // 손상된 쿠키: 세션이 있다고는 보되 만료 시각은 모른다 → 아래에서 auth 서버에 확인한다.
    return { expiresAt: null };
  }
}

/** 세션 쿠키 갱신 + 로그인 필수 가드 (명세 3-3: 1차 배포는 로그인 필수) */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;

  const loginRedirect = () => {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  };
  const homeRedirect = () => {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  };

  const session = readSessionCookie(request);

  // 토큰이 아직 넉넉히 살아 있으면 auth 서버에 묻지 않는다.
  // 요청마다 나가던 왕복이 사라지고(= 모든 페이지가 빨라진다),
  // auth 서버가 멎어도 토큰 수명 동안은 위키가 그대로 열린다.
  if (session?.expiresAt != null && session.expiresAt * 1000 - Date.now() > REFRESH_LEAD_MS) {
    return pathname === "/login" ? homeRedirect() : response;
  }

  const { url, anonKey } = supabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
    global: {
      // auth 서버가 느려도 요청이 매달리지 않도록 소켓 단에서 끊는다.
      fetch: withTimeout(AUTH_FETCH_TIMEOUT_MS),
    },
  });

  let user = null;
  let authDegraded = false;
  try {
    // getUser 는 토큰을 서버에서 검증하고, 필요하면 세션을 갱신한다.
    const result = await withDeadline(supabase.auth.getUser(), AUTH_DEADLINE_MS);
    user = result.data.user;
    // 네트워크/서버 장애(= 인증 실패가 아님)는 degraded 로 처리한다.
    // 연결 실패·타임아웃은 AuthRetryableFetchError(status 0)로 돌아온다.
    if (!user && result.error && isTransientAuthError(result.error)) authDegraded = true;
  } catch {
    // 마감시한 초과 또는 예외 — 어느 쪽이든 auth 서버 문제다.
    authDegraded = true;
  }

  // auth 서버 장애 중: 아직 만료되지 않은 세션을 가진 사람은 그대로 통과시킨다.
  // 이미 만료된 토큰은 통과시켜도 데이터 질의가 RLS 에서 막혀 빈 화면이 되므로,
  // 차라리 로그인 화면으로 보낸다.
  const sessionStillValid = session != null && (session.expiresAt == null || session.expiresAt * 1000 > Date.now());
  if (authDegraded && sessionStillValid) {
    return pathname === "/login" ? homeRedirect() : response;
  }

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: authDegraded ? "auth_unavailable" : "unauthorized" },
      { status: authDegraded ? 503 : 401 },
    );
  }

  if (!user && !isPublicPath(pathname)) return loginRedirect();
  if (user && pathname === "/login") return homeRedirect();

  return response;
}
