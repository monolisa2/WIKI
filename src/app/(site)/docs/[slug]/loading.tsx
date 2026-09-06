/** 문서 로딩 중 골격: 헤더가 먼저 보이고 본문 자리가 잡혀 있어 체감 속도가 빨라진다 */
export default function Loading() {
  return (
    <div className="bg-surface">
      <div className="wrap animate-pulse py-9 sm:py-12" aria-busy="true" aria-label="문서를 불러오는 중">
        <div className="h-3.5 w-28 rounded bg-black/[0.06]" />
        <div className="mt-7 h-14 w-14 rounded-[14px] bg-black/[0.06]" />
        <div className="mt-6 h-5 w-12 rounded-full bg-black/[0.06]" />
        <div className="mt-3 h-10 w-2/3 max-w-xl rounded-md bg-black/[0.07]" />
        <div className="mt-4 h-5 w-full max-w-3xl rounded bg-black/[0.05]" />
        <div className="mt-2 h-5 w-3/4 max-w-2xl rounded bg-black/[0.05]" />
        <div className="mt-7 grid grid-cols-2 gap-6 border-y border-hairline py-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="h-3 w-16 rounded bg-black/[0.05]" />
              <div className="mt-2 h-4 w-24 rounded bg-black/[0.06]" />
            </div>
          ))}
        </div>
        <div className="mt-9 space-y-3">
          <div className="h-9 w-1/3 rounded-[10px] bg-black/[0.06]" />
          <div className="h-4 w-full rounded bg-black/[0.05]" />
          <div className="h-4 w-11/12 rounded bg-black/[0.05]" />
          <div className="h-4 w-4/5 rounded bg-black/[0.05]" />
        </div>
      </div>
    </div>
  );
}
