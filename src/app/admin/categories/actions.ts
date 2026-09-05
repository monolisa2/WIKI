"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SLUG_PATTERN } from "@/lib/constants";

function back(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  redirect(`/admin/categories${qs ? `?${qs}` : ""}`);
}

export async function createCategory(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!SLUG_PATTERN.test(slug)) back({ error: "slug 는 영문 소문자·숫자·하이픈만 사용할 수 있습니다." });
  if (!name) back({ error: "분류 이름을 입력해주세요." });

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .insert({ slug, name, hint: hint || null, sort_order: Number.isFinite(sortOrder) ? sortOrder : 0 });

  if (error) back({ error: error.code === "23505" ? `이미 있는 slug 입니다: ${slug}` : error.message });

  revalidatePath("/admin/categories");
  revalidatePath("/");
  back({ saved: "1" });
}

export async function updateCategory(formData: FormData) {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const hint = String(formData.get("hint") ?? "").trim();
  const sortOrder = Number(formData.get("sort_order") ?? 0);

  if (!Number.isInteger(id)) back({ error: "잘못된 분류입니다." });
  if (!name) back({ error: "분류 이름을 입력해주세요." });

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name, hint: hint || null, sort_order: Number.isFinite(sortOrder) ? sortOrder : 0 })
    .eq("id", id);

  if (error) back({ error: error.message });

  revalidatePath("/admin/categories");
  revalidatePath("/");
  back({ saved: "1" });
}
