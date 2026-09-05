import { STATUSES, type Status } from "@/lib/constants";

const STYLES: Record<Status, string> = {
  draft: "bg-warn-soft text-warn",
  published: "bg-accent-soft text-accent",
  archived: "bg-black/[0.06] text-ink-3",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`badge ${STYLES[status] ?? STYLES.draft}`}>{STATUSES[status] ?? status}</span>;
}
