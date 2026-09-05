import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DocumentForm, EMPTY_INPUT } from "@/components/DocumentForm";
import type { Category } from "@/lib/types";

export const metadata: Metadata = { title: "새 문서" };

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("*").order("sort_order");
  const categories = (data ?? []) as Category[];
  const preset = categories.find((c) => c.slug === category);

  return (
    <div>
      <h1 className="text-xl font-black tracking-tight">새 문서</h1>
      <div className="mt-6">
        <DocumentForm categories={categories} initial={{ ...EMPTY_INPUT, category_id: preset ? String(preset.id) : "" }} />
      </div>
    </div>
  );
}
