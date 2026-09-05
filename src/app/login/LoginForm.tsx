"use client";

import { useActionState } from "react";
import { sendMagicLink, verifyEmailCode, type CodeState, type LoginState } from "./actions";

export function LoginForm({ next, initialError, errorDetail }: { next?: string; initialError?: string; errorDetail?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  if (state.sent && state.email) {
    return <CodeForm email={state.email} next={next} />;
  }

  const error = state.error ?? initialError;

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
      {error ? (
        <div className="space-y-1">
          <p className="text-sm text-danger">{error}</p>
          {errorDetail ? <p className="break-all font-mono text-[11px] text-ink-3">{errorDetail}</p> : null}
        </div>
      ) : null}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "보내는 중…" : "로그인 메일 받기"}
      </button>
      <p className="text-xs text-ink-2 text-center">
        비밀번호 없이 메일로 받은 링크를 누르거나 코드를 입력해 로그인합니다. 회사 도메인 계정만 가입할 수 있습니다.
      </p>
    </form>
  );
}

/** 메일 발송 후: 6자리 코드 입력 (링크를 눌러도 됨) */
function CodeForm({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState<CodeState, FormData>(verifyEmailCode, {});

  return (
    <div>
      <div className="text-center">
        <p className="text-lg font-bold">메일을 확인해주세요</p>
        <p className="mt-2 text-sm text-ink-2">
          <span className="font-semibold text-ink">{email}</span> 으로 로그인 메일을 보냈습니다.
          <br />
          메일이 보이지 않으면 스팸함을 확인해주세요.
        </p>
      </div>

      <form action={action} className="mt-6 space-y-3">
        <input type="hidden" name="email" value={email} />
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <label htmlFor="token" className="label">
            메일에 있는 6자리 코드
          </label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            className="input text-center text-[22px] font-semibold tracking-[0.35em]"
            autoFocus
          />
        </div>
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <button type="submit" className="btn-primary w-full" disabled={pending}>
          {pending ? "확인 중…" : "코드로 로그인"}
        </button>
      </form>

      <p className="mt-4 rounded-field bg-black/[0.04] px-4 py-3 text-left text-[13px] leading-relaxed text-ink-2">
        메일의 <strong className="text-ink">로그인 버튼</strong>을 눌러도 됩니다. 버튼은 이 브라우저에서만 동작하지만, 코드는 어느 기기에서든 입력할 수
        있습니다. 여러 번 요청했다면 <strong className="text-ink">가장 마지막 메일</strong>만 유효합니다.
      </p>
    </div>
  );
}
