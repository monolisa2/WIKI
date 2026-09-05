import { headers } from "next/headers";

/**
 * 사이트 주소 (매직링크 콜백용). 서버 전용.
 * NEXT_PUBLIC_SITE_URL 이 있으면 그 값을, 없으면 현재 요청의 호스트에서 알아낸다.
 * Vercel 은 x-forwarded-host / x-forwarded-proto 헤더를 넣어주므로 배포 주소를 미리 알 필요가 없다.
 * (콜백 주소는 Supabase 의 Redirect URLs 허용 목록에 있어야만 동작하므로 호스트 헤더 위조로 다른 곳에 보낼 수 없다.)
 */
export async function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
