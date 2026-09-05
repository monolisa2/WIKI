import { STATUSES, type Status } from "@/lib/constants";

const STYLES: Record<Status, string> = {
  draft: "bg-amber-50 text-amber-700 border border-amber-200",
  published: "bg-brand-pale text-brand-deep border border-brand-line",
  archived: "bg-gray-100 text-gray-500 border border-gray-200",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${STYLES[status] ?? STYLES.draft}`}>{STATUSES[status] ?? status}</span>;
}
