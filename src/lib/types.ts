import type { DocType, Scope, SourceSystem, Status } from "./constants";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  company: "enliple" | "mobisoft" | "mobiwith" | "anic" | null;
  role: "member" | "admin";
  created_at: string;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  hint: string | null;
  sort_order: number;
};

export type Document = {
  id: string;
  category_id: number;
  slug: string;
  title: string;
  summary: string | null;
  body_md: string | null;
  doc_type: DocType;
  scope: Scope[];
  source_system: SourceSystem | null;
  source_url: string | null;
  owner_team: string | null;
  effective_date: string | null;
  revised_date: string | null;
  status: Status;
  is_pinned: boolean | null;
  sort_order: number | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRevision = {
  id: number;
  document_id: string;
  version: number;
  title: string | null;
  summary: string | null;
  body_md: string | null;
  change_note: string | null;
  revised_by: string | null;
  revised_at: string;
};

/** 문서 편집 폼에서 쓰는 입력값 (문자열 기반) */
export type DocumentInput = {
  category_id: string;
  slug: string;
  title: string;
  summary: string;
  body_md: string;
  doc_type: DocType;
  scope: Scope[];
  source_system: SourceSystem | "";
  source_url: string;
  owner_team: string;
  effective_date: string;
  revised_date: string;
  is_pinned: boolean;
  sort_order: string;
};
