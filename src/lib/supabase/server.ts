import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/**
 * Supabase 한 번 호출의 최대 대기 시간.
 * 응답이 없을 때 서버리스 함수 전체가 매달려 504 가 되는 것을 막는다.
 */
const QUERY_TIMEOUT_MS = 5000;

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

/** Server Component · Server Action · Route Handler 용 클라이언트 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component 에서 호출되면 쿠키를 쓸 수 없다. middleware 가 세션을 갱신하므로 무시.
        }
      },
    },
    global: {
      fetch: withTimeout(QUERY_TIMEOUT_MS),
    },
  });
}
