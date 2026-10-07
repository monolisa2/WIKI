import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PUBLIC_PREFIXES = ["/login", "/auth"];

/**
 * Supabase auth 서버 응답을 기다리는 최대 시간.
 * Vercel 미들웨어 전체 예산(25s)보다 훨씬 짧게 잡아야 한 번의 장애가
 * 사이트 전체 504(MIDDLEWARE_INVOCATION_TIMEOUT)로 번지지 않는다.
 */
const AUTH_TIMEOUT_MS = 2500;

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

/** 인증 실패가 아니라 auth 서버에 닿지 못한 경우인지 */
function isTransientAuthError(error: { name?: string; status?: number | null }) {
  if (error.name === "AuthRetryableFetchError") return true;
  const status = error.status;
  return status == null || status === 0 || status === 429 || status >= 500;
}

/** 로그인 세션 쿠키가 있는지(검증 없이 존재 여부만) 확인 */
function hasAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

/** 세션 쿠키 갱신 + 로그인 필수 가드 (명세 3-3: 1차 배포는 로그인 필수) */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
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
      fetch: withTimeout(AUTH_TIMEOUT_MS),
    },
  });

  let user = null;
  let authDegraded = false;
  try {
    // getUser 는 토큰을 서버에서 검증한다. 세션 갱신을 위해 반드시 호출.
    const result = await supabase.auth.getUser();
    user = result.data.user;
    // 네트워크/서버 장애(= 인증 실패가 아님)는 degraded 로 처리한다.
    // 연결 실패·타임아웃은 AuthRetryableFetchError(status 0)로 돌아온다.
    if (!user && result.error && isTransientAuthError(result.error)) {
      authDegraded = true;
    }
  } catch {
    authDegraded = true;
  }

  const { pathname, search } = request.nextUrl;

  // auth 서버 장애 중: 이미 세션 쿠키를 가진 사람은 그대로 통과시킨다.
  // (데이터는 RLS 로 보호되므로, 위조된 쿠키로는 아무 행도 읽히지 않는다.)
  if (authDegraded && hasAuthCookie(request)) {
    return response;
  }

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: authDegraded ? "auth_unavailable" : "unauthorized" }, { status: authDegraded ? 503 : 401 });
  }

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
