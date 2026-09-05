import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <p className="text-[13px] font-medium text-ink-3">404</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-[15px] text-ink-2">문서가 삭제되었거나 아직 공개되지 않았을 수 있습니다.</p>
        <Link href="/" className="btn-primary mt-6">
          홈으로
        </Link>
      </div>
    </main>
  );
}
