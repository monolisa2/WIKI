"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/users");
  const { data: me } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") redirect("/admin");
  return { supabase, me: me as { id: string; role: string } };
}

/** 이미 로그인한 사람의 권한 변경. 본인은 바꿀 수 없다 (관리자 0명 사고 방지). */
export async function setRole(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");
  const { supabase, me } = await requireAdmin();
  if (!id || (role !== "admin" && role !== "member")) redirect("/admin/users?error=" + encodeURIComponent("잘못된 요청입니다."));
  if (id === me.id) redirect("/admin/users?error=" + encodeURIComponent("본인 권한은 바꿀 수 없습니다. 다른 관리자에게 요청하세요."));
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) redirect("/admin/users?error=" + encodeURIComponent(error.message));
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

/** 아직 로그인한 적 없는 사람을 이메일로 예약. 첫 로그인 때 관리자로 만들어진다. */
export async function addInvite(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { supabase, me } = await requireAdmin();
  if (!EMAIL.test(email)) redirect("/admin/users?error=" + encodeURIComponent("이메일 형식을 확인해주세요."));
  const { data: allowed } = await supabase.rpc("company_for_email", { p_email: email });
  if (!allowed) redirect("/admin/users?error=" + encodeURIComponent("허용된 회사 도메인의 이메일만 등록할 수 있습니다."));
  const { error } = await supabase.from("admin_invites").upsert({ email, invited_by: me.id });
  if (error) redirect("/admin/users?error=" + encodeURIComponent(error.message));
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}

export async function removeInvite(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const { supabase } = await requireAdmin();
  await supabase.from("admin_invites").delete().eq("email", email);
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=1");
}
