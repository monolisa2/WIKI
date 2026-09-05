export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

export function isStale(revisedDate: string | null, now = new Date()) {
  if (!revisedDate) return false;
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return new Date(revisedDate) < oneYearAgo;
}
