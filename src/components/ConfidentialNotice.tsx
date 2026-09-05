/** 상단 대외비 취급 안내 (참고: 이전 사내 위키의 첫 블록) */
export function ConfidentialNotice() {
  const rules = [
    { name: "기밀 유지", text: "문서 내용을 외부에 공유하지 않습니다." },
    { name: "액세스 제어", text: "회사 계정으로 로그인한 임직원만 접근합니다." },
    { name: "정보 보호", text: "개인 기기에 저장하거나 외부로 복사하지 않습니다." },
  ];
  return (
    <aside className="card flex gap-4 px-5 py-4 sm:px-6" aria-label="사내 문서 취급 안내">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10" width="16" height="11" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold">
          이 위키의 모든 문서는 회사 내부 자료이며 <span className="text-accent">대외비</span>로 취급됩니다.
        </p>
        <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {rules.map((r) => (
            <li key={r.name}>
              <span className="font-medium text-ink">{r.name}</span> · {r.text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
