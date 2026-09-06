export const DOC_TYPES = {
  rule: "규정",
  guide: "안내",
  form: "양식",
  link: "링크",
} as const;
export type DocType = keyof typeof DOC_TYPES;

// 회사 표기 (에이닉: 채용 사이트·언론 보도 표기 기준. 코드 anic 은 DB 값이라 유지)
export const SCOPES = {
  all: "전 계열사",
  enliple: "인라이플",
  mobisoft: "모비소프트",
  mobiwith: "모비위드",
  anic: "에이닉",
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

/** 아이콘이 비어 있을 때 쓰는 유형별 기본 이모지 */
export const DEFAULT_DOC_ICON: Record<DocType, string> = { rule: "📘", guide: "📄", form: "📝", link: "🔗" };
export const DEFAULT_CATEGORY_ICON = "📁";
export function docIcon(icon: string | null | undefined, type: DocType) {
  return icon?.trim() || DEFAULT_DOC_ICON[type] || DEFAULT_DOC_ICON.guide;
}
/** 편집 화면 빠른 선택 이모지 */
export const ICON_CHOICES = ["📄", "📘", "📝", "🔗", "✅", "💡", "⚠️", "📌", "🗓️", "⏰", "🌴", "👶", "💐", "🎂", "🎁", "💳", "💰", "🏅", "🎓", "📚", "🏥", "🩺", "🚕", "🍱", "✈️", "🏠", "🔑", "🔒", "🖨️", "💻", "📱", "🪪", "📇", "🏢", "🤝", "⚖️", "📣", "📞", "🎨", "🌱"];

export const SLUG_PATTERN = /^[a-z0-9가-힣][a-z0-9가-힣-]*$/;

export function isKey<T extends Record<string, unknown>>(obj: T, key: unknown): key is keyof T {
  return typeof key === "string" && key in obj;
}
