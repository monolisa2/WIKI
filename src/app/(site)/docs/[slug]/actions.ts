"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** 임직원 제보 (오류·누락). feedback 테이블, RLS: 본인 insert 만 허용 */
export async function submitFeedback(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const documentId = String(formData.get("document_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const back = (status: "sent" | "error") => redirect(`/docs/${encodeURIComponent(slug)}?feedback=${status}#feedback`);

  if (!slug || !documentId || message.length < 5 || message.length > 2000) back("error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/docs/${encodeURIComponent(slug)}`);

  const { error } = await supabase.from("feedback").insert({ document_id: documentId, message, submitted_by: user.id });
  if (error) back("error");

  revalidatePath(`/docs/${slug}`);
  back("sent");
}
