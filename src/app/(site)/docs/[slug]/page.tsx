import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocView, type DocViewDocument, type DocViewRevision } from "@/components/doc/DocView";
import { submitFeedback } from "./actions";

function decodeSlug(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function loadDocument(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("*, categories(slug, name, icon)").eq("slug", slug).maybeSingle();
  return { supabase, doc: (data as DocViewDocument | null) ?? null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { doc } = await loadDocument(decodeSlug(slug));
  return { title: doc?.title ?? "문서", description: doc?.summary ?? undefined };
}

/** 문서 상세 `/docs/[slug]` (명세 3-1): 본문 + 메타 + 개정 이력(접힘) + 원문 보기 + 제보 */
export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ feedback?: string }>;
}) {
  const { slug: rawSlug } = await params;
  const { feedback } = await searchParams;
  const slug = decodeSlug(rawSlug);

  const { supabase, doc } = await loadDocument(slug);
  if (!doc) notFound();

  const { data: revData } = await supabase
    .from("document_revisions")
    .select("version, change_note, revised_at")
    .eq("document_id", doc.id)
    .order("version", { ascending: false });

  return <DocView doc={doc} revisions={(revData ?? []) as DocViewRevision[]} feedback={feedback} feedbackAction={submitFeedback} />;
}
