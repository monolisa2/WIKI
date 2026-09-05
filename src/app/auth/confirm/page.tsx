import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { confirmLogin } from "./actions";

export const metadata: Metadata = { title: "로그인 확인" };

/**
 * 메일 링크가 도착하는 곳 (커스텀 템플릿: /auth/confirm?token_hash=…&type=email).
 * 자동으로 검증하지 않고 버튼(POST)을 눌러야 로그인되므로, 메일 보안 검사가 링크를 미리 열어도 토큰이 소모되지 않는다.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash: tokenHash, type, next } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8 text-center">
        <BrandMark href="/login" />
        {tokenHash ? (
          <>
            <h1 className="mt-4 text-xl font-black tracking-tight">로그인을 완료할까요?</h1>
            <p className="mt-2 text-sm text-ink-2">아래 버튼을 누르면 인라이플 위키에 로그인됩니다.</p>
            <form action={confirmLogin} className="mt-6">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={type ?? "email"} />
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <button type="submit" className="btn-primary w-full">
                로그인
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-xl font-black tracking-tight">링크 정보가 없습니다</h1>
            <p className="mt-2 text-sm text-ink-2">메일의 링크를 다시 누르거나 새 로그인 메일을 요청해주세요.</p>
            <Link href="/login" className="btn-secondary mt-6">
              로그인 화면으로
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
