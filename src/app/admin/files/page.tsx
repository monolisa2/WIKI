import type { Metadata } from "next";
import { BulkAttachmentImport } from "@/components/admin/BulkAttachmentImport";

export const metadata: Metadata = { title: "첨부 일괄 등록" };

/** 여러 문서의 첨부 파일을 한 번에 올리는 화면. 파일 이름 앞에 문서 slug 를 붙여 매칭한다. */
export default function BulkFilesPage() {
  return (
    <div>
      <h1 className="text-xl font-black tracking-tight">첨부 일괄 등록</h1>
      <p className="mt-1 text-sm text-ink-2">양식·규정 원문 파일을 여러 문서에 한 번에 붙입니다. 문서 하나에만 올릴 때는 그 문서의 편집 화면에서 올리면 됩니다.</p>
      <div className="mt-6">
        <BulkAttachmentImport />
      </div>
    </div>
  );
}
