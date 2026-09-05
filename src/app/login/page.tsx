import type { Metadata } from "next";
import { BrandMark } from "@/components/Brand";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "로그인" };

const ERROR_MESSAGES: Record<string, string> = {
  link: "로그인 링크가 만료되었거나 올바르지 않습니다. 다시 요청해주세요.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <BrandMark href="/login" />
          <h1 className="mt-4 text-xl font-black tracking-tight">인라이플 위키 로그인</h1>
        </div>
        <LoginForm next={next} initialError={error ? ERROR_MESSAGES[error] ?? "로그인에 실패했습니다." : undefined} />
      </div>
    </main>
  );
}
