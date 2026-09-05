"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/supabase/site-url";

export type LoginState = {
  error?: string;
  sent?: boolean;
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "");

  if (!EMAIL_PATTERN.test(email)) {
    return { error: "이메일 주소를 확인해주세요." };
  }

  const supabase = await createClient();

  // 1차 검사: 허용 도메인 (DB 트리거가 최종 차단하지만, 친절한 메시지를 위해 먼저 확인)
  const { data: company, error: lookupError } = await supabase.rpc("company_for_email", { p_email: email });
  if (lookupError) {
    return { error: `도메인 확인 중 오류가 발생했습니다. (${lookupError.message})` };
  }
  if (!company) {
    return { error: "회사 이메일 계정(@enliple.com 등)으로만 로그인할 수 있습니다." };
  }

  const callback = new URL("/auth/callback", await siteUrl());
  if (next.startsWith("/") && !next.startsWith("//")) callback.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) {
    return { error: `로그인 링크를 보내지 못했습니다. (${error.message})` };
  }

  return { sent: true, email };
}

export type CodeState = {
  error?: string;
};

/** 메일로 받은 6자리 코드로 로그인 (링크를 열 수 없는 환경, 다른 기기에서도 동작) */
export async function verifyEmailCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  const next = String(formData.get("next") ?? "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!EMAIL_PATTERN.test(email)) return { error: "이메일 주소를 확인해주세요." };
  if (token.length < 6) return { error: "메일에 있는 6자리 숫자 코드를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    const m = `${error.code ?? ""} ${error.message}`.toLowerCase();
    if (m.includes("expired") || m.includes("invalid")) {
      return { error: "코드가 맞지 않거나 만료되었습니다. 가장 마지막에 받은 메일의 코드인지 확인하고, 안 되면 새 코드를 요청해주세요." };
    }
    return { error: `로그인에 실패했습니다. (${error.message})` };
  }

  redirect(safeNext);
}
