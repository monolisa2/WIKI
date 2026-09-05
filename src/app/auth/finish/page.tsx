"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function classify(message: string) {
  const m = message.toLowerCase();
  if (m.includes("expired")) return "expired";
  if (m.includes("verifier") || m.includes("pkce")) return "browser";
  if (m.includes("already") || m.includes("invalid")) return "used";
  return "unknown";
}

/**
 * 해시(#access_token=…) 방식으로 돌아온 로그인을 브라우저에서 마무리한다.
 * 서버는 URL 해시를 볼 수 없으므로 /auth/callback 이 파라미터 없이 호출되면 여기로 보낸다.
 */
export default function FinishPage() {
  const [message, setMessage] = useState("로그인을 마무리하는 중…");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const rawNext = query.get("next") ?? "/";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

    const go = (reason: string, detail?: string) => {
      const url = new URL("/login", window.location.origin);
      url.searchParams.set("error", reason);
      if (detail) url.searchParams.set("detail", detail.slice(0, 200));
      window.location.replace(url.toString());
    };

    const errorDesc = hash.get("error_description") ?? hash.get("error");
    if (errorDesc) {
      go(classify(errorDesc), `${hash.get("error_code") ?? hash.get("error") ?? ""}: ${errorDesc}`);
      return;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (!accessToken || !refreshToken) {
      go("missing", `query=${window.location.search || "(없음)"} hash=${window.location.hash ? "있음" : "없음"}`);
      return;
    }

    const supabase = createClient();
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          go("unknown", error.message);
          return;
        }
        setMessage("로그인되었습니다. 이동합니다…");
        window.location.replace(next);
      });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-[15px] text-ink-2">{message}</p>
    </main>
  );
}
