import { DOC_TYPES, type DocType } from "@/lib/constants";

const STYLES: Record<DocType, string> = {
  rule: "bg-accent-bright text-ink",
  guide: "bg-accent-soft text-accent",
  form: "bg-black/[0.06] text-ink-2",
  link: "bg-black/[0.06] text-ink-2",
};

export function TypeBadge({ type }: { type: DocType }) {
  return <span className={`badge ${STYLES[type] ?? STYLES.guide}`}>{DOC_TYPES[type] ?? type}</span>;
}
