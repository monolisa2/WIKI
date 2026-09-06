/** 첨부 파일 공용 유틸 (서버·클라이언트 공용, 브라우저 API 의존 없음) */

export const ATTACHMENT_BUCKET = "attachments";
export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;

export type Attachment = {
  id: string;
  document_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number | null;
  created_at: string;
};

export function formatBytes(n: number | null | undefined) {
  if (!n || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

export function fileExt(name: string) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

const KINDS: Record<string, { icon: string; label: string; inline?: boolean }> = {
  pdf: { icon: "📕", label: "PDF", inline: true },
  xlsx: { icon: "📊", label: "엑셀" },
  xls: { icon: "📊", label: "엑셀" },
  csv: { icon: "📊", label: "CSV" },
  docx: { icon: "📝", label: "워드" },
  doc: { icon: "📝", label: "워드" },
  hwp: { icon: "📄", label: "한글" },
  hwpx: { icon: "📄", label: "한글" },
  pptx: { icon: "📽️", label: "파워포인트" },
  ppt: { icon: "📽️", label: "파워포인트" },
  zip: { icon: "🗜️", label: "압축" },
  png: { icon: "🖼️", label: "이미지", inline: true },
  jpg: { icon: "🖼️", label: "이미지", inline: true },
  jpeg: { icon: "🖼️", label: "이미지", inline: true },
  gif: { icon: "🖼️", label: "이미지", inline: true },
  webp: { icon: "🖼️", label: "이미지", inline: true },
  txt: { icon: "📄", label: "텍스트", inline: true },
  md: { icon: "📄", label: "문서" },
};

/** 확장자별 아이콘·종류 이름. inline=true 면 브라우저에서 바로 볼 수 있다. */
export function fileKind(name: string) {
  return KINDS[fileExt(name)] ?? { icon: "📎", label: fileExt(name).toUpperCase() || "파일" };
}

/** Storage 경로: 한글·공백을 피하기 위해 uuid 로 저장하고, 원래 이름은 테이블에 둔다. */
export function buildStoragePath(documentId: string, fileName: string, uuid: string) {
  const ext = fileExt(fileName);
  return `${documentId}/${uuid}${ext ? `.${ext}` : ""}`;
}

/** 일괄 등록용 파일 이름 규칙: "<slug>__<원래 이름>.<ext>" */
export function parseBulkName(name: string): { slug: string; fileName: string } | null {
  const i = name.indexOf("__");
  if (i <= 0) return null;
  const slug = name.slice(0, i).trim().toLowerCase();
  const fileName = name.slice(i + 2).trim();
  if (!slug || !fileName) return null;
  return { slug, fileName };
}
