"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, {});

  if (state.sent) {
    return (
      <div className="text-center">
        <p className="text-lg font-bold">메일을 확인해주세요</p>
        <p className="mt-2 text-sm text-ink-soft">
          <span className="font-semibold text-ink">{state.email}</span> 으로 로그인 링크를 보냈습니다.
          <br />
          메일이 보이지 않으면 스팸함을 확인해주세요.
        </p>
      </div>
    );
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
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "보내는 중…" : "로그인 링크 받기"}
      </button>
      <p className="text-xs text-ink-soft text-center">
        비밀번호 없이 메일로 받은 링크를 눌러 로그인합니다. 회사 도메인 계정만 가입할 수 있습니다.
      </p>
    </form>
  );
}
