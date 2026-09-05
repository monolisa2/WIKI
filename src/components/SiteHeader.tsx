import Link from "next/link";
import { BrandMark } from "@/components/Brand";
import { SearchTrigger } from "@/components/search/SearchCommand";

/** 임직원 화면 상단 바: 유리질(glass) 고정 헤더 + 통합 검색 트리거 */
export function SiteHeader({ userLabel, isAdmin }: { userLabel: string; isAdmin: boolean }) {
  return (
    <header className="glass hairline-b sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-5 sm:px-8">
        <BrandMark />
        <div className="flex flex-1 justify-center">
          <SearchTrigger />
        </div>
        <nav className="flex items-center gap-1 text-[13px]" aria-label="계정">
          {isAdmin ? (
            <Link href="/admin" className="btn-ghost h-9">
              관리자
            </Link>
          ) : null}
          <span className="hidden max-w-[180px] truncate px-2 text-ink-3 md:inline">{userLabel}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-ghost h-9">
              로그아웃
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
