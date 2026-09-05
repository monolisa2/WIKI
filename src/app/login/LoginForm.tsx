"use client";

import Link from "next/link";
import { useActionState } from "react";
import { sendLoginCode, verifyLoginCode, type CodeState, type LoginState } from "./actions";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendLoginCode, {});

  if (state.sent && state.email) {
    return <CodeForm email={state.email} next={next} />;
  }

  const error = state.error ?? initialError;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          회사 이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@enliple.com"
          className="input"
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "보내는 중…" : "로그인 코드 받기"}
      </button>
      <p className="text-xs text-ink-2 text-center">
        비밀번호 없이 메일로 받은 숫자 코드를 입력해 로그인합니다. 회사 도메인 계정만 가입할 수 있습니다.
      </p>
    </form>
  );
}

/** 2단계: 코드 입력 */
function CodeForm({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState<CodeState, FormData>(verifyLoginCode, {});

  return (
    <div>
      <div className="text-center">
        <p className="text-lg font-bold">메일을 확인해주세요</p>
        <p className="mt-2 text-sm text-ink-2">
          <span className="font-semibold text-ink">{email}</span> 으로 로그인 코드를 보냈습니다.
          <br />
          메일이 보이지 않으면 스팸함을 확인해주세요.
        </p>
      </div>

      <form action={action} className="mt-6 space-y-3">
        <input type="hidden" name="email" value={email} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <label htmlFor="token" className="label">
            메일에 있는 로그인 코드
          </label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={10}
            placeholder="코드 입력"
            className="input text-center text-[22px] font-semibold tracking-[0.3em] placeholder:tracking-normal placeholder:text-[15px] placeholder:font-normal"
            autoFocus
          />
        </div>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "확인 중…" : "로그인"}
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-ink-2">
        코드는 어느 기기에서든 입력할 수 있고, 여러 번 요청했다면 가장 마지막 메일만 유효합니다.
        <br />
        <Link href="/login" className="text-accent underline underline-offset-2">
          코드가 오지 않으면 다시 받기
        </Link>
      </p>
    </div>
  );
}
