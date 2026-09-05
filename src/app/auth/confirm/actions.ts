"use server";

import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

export async function confirmLogin(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const rawType = String(formData.get("type") ?? "email");
  const type = (TYPES as string[]).includes(rawType) ? (rawType as EmailOtpType) : "email";
  const rawNext = String(formData.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (!tokenHash) redirect("/login?error=missing");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    const m = `${error.code ?? ""} ${error.message}`.toLowerCase();
    const reason = m.includes("expired") || m.includes("invalid") ? "expired" : "unknown";
    const url = new URLSearchParams({ error: reason, detail: `${error.code ?? "error"}: ${error.message}`.slice(0, 200) });
    redirect(`/login?${url.toString()}`);
  }
  redirect(next);
}
