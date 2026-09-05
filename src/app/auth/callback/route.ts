import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/env";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/** 실패 원인을 로그인 화면에서 사람이 읽을 수 있는 종류로 분류 */
function classifyAuthError(message: string | null | undefined, code?: string | null) {
  const m = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (m.includes("otp_expired") || m.includes("expired")) return "expired";
  if (m.includes("verifier") || m.includes("pkce")) return "browser";
  if (m.includes("already") || m.includes("invalid") || m.includes("not found")) return "used";
  return "unknown";
}

function toLogin(base: string, reason: string, detail?: string | null) {
  const url = new URL("/login", base);
  url.searchParams.set("error", reason);
  if (detail) url.searchParams.set("detail", detail.slice(0, 200));
  return NextResponse.redirect(url);
}

/**
 * 매직링크 콜백.
 * - ?code=            PKCE 방식 (기본 메일 템플릿) → exchangeCodeForSession
 * - ?token_hash=&type= 서버 검증 방식 (커스텀 템플릿) → verifyOtp
 * - ?error=…          Supabase 가 검증 실패를 알려준 경우 → 원인 표시
 * - 파라미터 없음      #access_token 해시 방식일 수 있으므로 /auth/finish 에서 브라우저가 마무리
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const base = await siteUrl();
  const next = safeNext(searchParams.get("next"));

  const authError = searchParams.get("error");
  const authErrorCode = searchParams.get("error_code");
  const authErrorDesc = searchParams.get("error_description");
  if (authError || authErrorCode) {
    return toLogin(base, classifyAuthError(authErrorDesc, authErrorCode), `${authErrorCode ?? authError}: ${authErrorDesc ?? ""}`);
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "email";

  if (!code && !tokenHash) {
    const finish = new URL("/auth/finish", base);
    finish.searchParams.set("next", next);
    return NextResponse.redirect(finish);
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash as string, type });

  if (error) {
    return toLogin(base, classifyAuthError(error.message, error.code), `${error.code ?? error.status ?? "error"}: ${error.message}`);
  }
  return NextResponse.redirect(new URL(next, base));
}
