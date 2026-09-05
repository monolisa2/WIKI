export const DOC_TYPES = {
  rule: "규정",
  guide: "안내",
  form: "양식",
  link: "링크",
} as const;
export type DocType = keyof typeof DOC_TYPES;

// 회사 표기: enliple 외 3사 한글명은 확정 후 교체
export const SCOPES = {
  all: "전 계열사",
  enliple: "인라이플",
  mobisoft: "mobisoft",
  mobiwith: "mobiwith",
  anic: "anic",
} as const;
export type Scope = keyof typeof SCOPES;

export const SOURCE_SYSTEMS = {
  wiki: "위키 자체 문서",
  groupware: "그룹웨어",
  naverworks: "네이버웍스",
  amaranth: "아마란스",
  notion: "노션",
  unknown: "미확인",
} as const;
export type SourceSystem = keyof typeof SOURCE_SYSTEMS;

export const STATUSES = {
  draft: "작성 중",
  published: "공개 중",
  archived: "보관",
} as const;
export type Status = keyof typeof STATUSES;

export const SLUG_PATTERN = /^[a-z0-9가-힣][a-z0-9가-힣-]*$/;

export function isKey<T extends Record<string, unknown>>(obj: T, key: unknown): key is keyof T {
  return typeof key === "string" && key in obj;
}
