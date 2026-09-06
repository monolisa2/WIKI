import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocView, type DocViewDocument, type DocViewRevision } from "@/components/doc/DocView";
import { submitFeedback } from "./actions";
import type { Attachment } from "@/lib/files";

/** 본문 마크다운의 `/docs/slug` 링크 대상 slug 목록 */
function linkedSlugs(bodyMd: string | null) {
  if (!bodyMd) return [];
  const out = new Set<string>();
  for (const m of bodyMd.matchAll(/\]\(\/docs\/([^)#?\s/]+)/g)) out.add(decodeSlug(m[1]));
  return Array.from(out);
}

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

  // 본문이 링크한 위키 문서 중 이 사용자에게 보이지 않는 것(미공개 초안 등)은 링크 대신 "준비 중"으로 표시한다
  const linked = linkedSlugs(doc.body_md);
  const [{ data: revData }, { data: attData }, { data: linkData }] = await Promise.all([
    supabase.from("document_revisions").select("version, change_note, revised_at").eq("document_id", doc.id).order("version", { ascending: false }),
    supabase.from("document_attachments").select("*").eq("document_id", doc.id).order("sort_order").order("created_at"),
    linked.length ? supabase.from("documents").select("slug").in("slug", linked) : Promise.resolve({ data: [] as { slug: string }[] }),
  ]);
  const visible = new Set(((linkData ?? []) as { slug: string }[]).map((d) => d.slug));
  const missingSlugs = linked.filter((s) => !visible.has(s));

  return (
    <DocView
      doc={doc}
      revisions={(revData ?? []) as DocViewRevision[]}
      attachments={(attData ?? []) as Attachment[]}
      missingSlugs={missingSlugs}
      feedback={feedback}
      feedbackAction={submitFeedback}
    />
  );
}
