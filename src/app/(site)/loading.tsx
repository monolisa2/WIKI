/** 홈 로딩 중 골격 */
export default function Loading() {
  return (
    <div className="wrap animate-pulse pt-14 sm:pt-20" aria-busy="true" aria-label="불러오는 중">
      <div className="mx-auto h-10 w-40 rounded-md bg-black/[0.06]" />
      <div className="mx-auto mt-6 h-12 w-2/3 max-w-md rounded-md bg-black/[0.07]" />
      <div className="mx-auto mt-8 h-14 w-full max-w-3xl rounded-full bg-black/[0.06]" />
      <div className="mt-24 grid gap-x-12 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i}>
            <div className="h-7 w-1/2 rounded bg-black/[0.06]" />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-4/5 rounded bg-black/[0.05]" />
              <div className="h-4 w-3/5 rounded bg-black/[0.05]" />
              <div className="h-4 w-2/3 rounded bg-black/[0.05]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
