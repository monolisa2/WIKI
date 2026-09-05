"use server";

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
