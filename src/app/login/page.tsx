import type { Metadata } from "next";
import { BrandMark } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "로그인" };

const ERROR_MESSAGES: Record<string, string> = {
  link: "로그인 링크가 만료되었거나 올바르지 않습니다. 다시 요청해주세요.",
  expired: "로그인 링크가 만료되었거나 이미 사용되었습니다. 링크는 한 번만 쓸 수 있고 받은 뒤 1시간 안에 눌러야 합니다. 다시 요청해주세요.",
  used: "이 로그인 링크는 이미 사용되었거나 더 이상 유효하지 않습니다. 새 링크를 요청해주세요.",
  browser: "링크를 요청한 브라우저가 아닌 곳에서 열었습니다. 로그인 링크를 요청했던 같은 PC의 같은 브라우저에서 메일 링크를 열어주세요.",
  missing: "링크에 로그인 정보가 없습니다. 메일의 링크를 다시 누르거나 새 링크를 요청해주세요.",
  unknown: "로그인에 실패했습니다. 아래 상세 내용을 관리자에게 전달해주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; detail?: string }>;
}) {
  const { next, error, detail } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <BrandMark href="/login" />
          <h1 className="mt-4 text-xl font-black tracking-tight">인라이플 위키 로그인</h1>
        </div>
        <LoginForm next={next} initialError={error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.unknown : undefined} errorDetail={detail} />
      </div>
    </main>
  );
}
