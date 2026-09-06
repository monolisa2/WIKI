import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ConfirmButton } from "@/components/ConfirmButton";
import { SCOPES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { addInvite, removeInvite, setRole } from "./actions";

export const metadata: Metadata = { title: "관리자 계정" };

type Invite = { email: string; created_at: string };

/** 관리자 계정 관리: 로그인한 사람의 권한 토글 + 아직 로그인 전인 사람의 이메일 예약 */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const q = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profileRows }, { data: inviteRows, error: inviteError }] = await Promise.all([
    supabase.from("profiles").select("*").order("role").order("created_at"),
    supabase.from("admin_invites").select("email, created_at").order("created_at", { ascending: false }),
  ]);
  const profiles = (profileRows ?? []) as Profile[];
  const invites = (inviteRows ?? []) as Invite[];
  const admins = profiles.filter((p) => p.role === "admin");
  const members = profiles.filter((p) => p.role !== "admin");

  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">관리자 계정</h1>
      <p className="mt-1 text-sm text-ink-2">관리자는 문서 편집·발행, 분류, 첨부, 관리자 지정을 할 수 있습니다. 임직원은 공개 문서만 봅니다.</p>

      {q.saved ? <Notice tone="ok">저장했습니다.</Notice> : null}
      {q.error ? <Notice tone="error">{q.error}</Notice> : null}
      {inviteError ? (
        <Notice tone="error">
          예약 목록 테이블이 아직 없습니다. Supabase SQL Editor 에서 마이그레이션 <code>20260907000009_admin_invites.sql</code> 을 실행해주세요. (권한 토글은 지금도 동작합니다)
        </Notice>
      ) : null}

      <section className="card mt-6 p-5">
        <h2 className="text-[15px] font-semibold">관리자 {admins.length}명</h2>
        <UserTable rows={admins} meId={user?.id ?? ""} />
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-[15px] font-semibold">아직 로그인 전인 사람을 관리자로 예약</h2>
        <p className="mt-1 text-[13px] text-ink-2">이메일을 등록해 두면 그 사람이 처음 로그인할 때 바로 관리자가 됩니다. 이미 로그인한 사람이면 즉시 승격됩니다.</p>
        <form action={addInvite} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[260px] flex-1">
            <label className="label" htmlFor="invite-email">
              회사 이메일
            </label>
            <input id="invite-email" name="email" type="email" required className="input" placeholder="name@enliple.com" />
          </div>
          <button type="submit" className="btn-primary">
            예약
          </button>
        </form>
        {invites.length ? (
          <ul className="mt-4 divide-y divide-hairline text-[14px]">
            {invites.map((i) => (
              <li key={i.email} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {i.email} <span className="text-[12px] text-ink-3">· {formatDate(i.created_at)} 예약</span>
                </span>
                <form action={removeInvite}>
                  <input type="hidden" name="email" value={i.email} />
                  <button type="submit" className="btn-ghost h-8 text-[13px]">
                    취소
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card mt-6 p-5">
        <h2 className="text-[15px] font-semibold">임직원 {members.length}명</h2>
        <p className="mt-1 text-[13px] text-ink-2">한 번이라도 로그인한 계정만 보입니다. 관리자로 올리려면 오른쪽 버튼을 누르세요.</p>
        <UserTable rows={members} meId={user?.id ?? ""} />
      </section>
    </div>
  );
}

function UserTable({ rows, meId }: { rows: Profile[]; meId: string }) {
  if (!rows.length) return <p className="mt-3 text-[13px] text-ink-3">없습니다.</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12px] text-ink-3">
            <th className="py-2 pr-4 font-medium">이메일</th>
            <th className="py-2 pr-4 font-medium">이름</th>
            <th className="py-2 pr-4 font-medium">회사</th>
            <th className="py-2 pr-4 font-medium">첫 로그인</th>
            <th className="py-2 pr-4 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((p) => {
            const isMe = p.id === meId;
            const toAdmin = p.role !== "admin";
            return (
              <tr key={p.id}>
                <td className="py-2.5 pr-4">
                  {p.email}
                  {isMe ? <span className="ml-1.5 text-[12px] text-ink-3">(나)</span> : null}
                </td>
                <td className="py-2.5 pr-4">{p.name ?? "—"}</td>
                <td className="py-2.5 pr-4">{p.company ? SCOPES[p.company] : "—"}</td>
                <td className="py-2.5 pr-4 text-ink-2">{formatDate(p.created_at)}</td>
                <td className="py-2.5 text-right">
                  {isMe ? null : (
                    <form action={setRole}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="role" value={toAdmin ? "admin" : "member"} />
                      {toAdmin ? (
                        <button type="submit" className="btn-secondary h-8 text-[13px]">
                          관리자로
                        </button>
                      ) : (
                        <ConfirmButton message={`${p.email} 의 관리자 권한을 해제할까요?`} className="btn-ghost h-8 text-[13px]">
                          권한 해제
                        </ConfirmButton>
                      )}
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <p className={`mt-4 text-sm rounded-lg px-4 py-2 ${tone === "ok" ? "bg-accent-soft text-accent" : "bg-danger/8 text-danger"}`}>{children}</p>
  );
}
