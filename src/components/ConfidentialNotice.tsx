/** 상단 대외비 취급 안내 (참고: 이전 사내 위키의 첫 콜아웃 블록) */
export function ConfidentialNotice() {
  const rules = [
    { name: "기밀 유지", text: "문서 내용을 외부에 공유하지 않습니다." },
    { name: "액세스 제어", text: "회사 계정으로 로그인한 임직원만 접근합니다." },
    { name: "정보 보호", text: "개인 기기에 저장하거나 외부로 복사하지 않습니다." },
  ];
  return (
    <aside className="callout callout-warning my-0!" data-emoji="🔒" aria-label="사내 문서 취급 안내" role="note">
      <p className="font-semibold">
        이 위키의 모든 문서는 회사 내부 자료이며 <span className="text-warn">대외비</span>로 취급됩니다.
      </p>
      <ul className="mt-1.5! ml-0! list-none space-y-0.5 text-[14px] text-ink-2">
        {rules.map((r) => (
          <li key={r.name} className="my-0!">
            <span className="font-medium text-ink">{r.name}</span> · {r.text}
          </li>
        ))}
      </ul>
    </aside>
  );
}
