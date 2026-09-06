import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandMark } from "@/components/Brand";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/docs", label: "문서" },
  { href: "/admin/categories", label: "분류" },
  { href: "/admin/files", label: "첨부 일괄 등록" },
];

/** 관리자 화면 가드: profiles.role = 'admin' 만 통과 (DB 는 RLS 로 별도 강제) */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase.from("profiles").select("role, name, email").eq("id", user.id).maybeSingle();

  if (profile?.role !== "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-sm w-full p-8 text-center">
          <p className="text-lg font-bold">관리자 권한이 필요합니다</p>
          <p className="mt-2 text-sm text-ink-2">
            {user.email} 계정은 관리자로 등록되어 있지 않습니다. 인사관리실에 권한을 요청해주세요.
          </p>
          <Link href="/" className="btn-secondary mt-6">
            임직원 화면으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="glass hairline-b sticky top-0 z-40">
        <div className="wrap h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <BrandMark href="/admin" />
            <span className="badge bg-accent-soft text-accent">관리자</span>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="btn-ghost">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-2">
            <Link href="/" className="hover:text-ink">
              임직원 화면
            </Link>
            <span className="hidden sm:inline">{profile.name ?? profile.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-ghost">
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="wrap py-8">{children}</main>
    </div>
  );
}
