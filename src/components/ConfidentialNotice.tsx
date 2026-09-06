/** 상단 대외비 취급 안내: 한 줄로 짧게 (구성원이 매일 보는 화면이라 길게 반복하지 않는다) */
export function ConfidentialNotice() {
  return (
    <aside className="callout callout-warning my-0!" data-emoji="🔒" aria-label="사내 문서 취급 안내" role="note">
      <p className="text-[14px]">
        <strong>회사 내부 자료(대외비)</strong>입니다. 외부 공유, 개인 기기 저장·복사는 하지 않습니다.
      </p>
    </aside>
  );
}
