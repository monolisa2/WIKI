import { liveLabel, type LiveKind } from "@/lib/live-blocks";
import { getNinehireLetters, getNinehireNews, getNinehirePage, getNinehirePositions, ninehirePageUrl, NINEHIRE_SITE, type NhBlock } from "@/lib/ninehire";

/**
 * 연동 블록 (서버 컴포넌트): 채용 사이트의 최신 내용을 문서 본문 자리에 그려 넣는다.
 * 가져오기에 실패하면 원문 링크가 있는 안내만 보인다 (문서 나머지는 정상 표시).
 */
export async function LiveBlock({ kind, arg }: { kind: LiveKind; arg: string | null }) {
  switch (kind) {
    case "ninehire-letter":
      return <Letters />;
    case "ninehire-news":
      return <News />;
    case "ninehire-positions":
      return <Positions />;
    case "ninehire-page":
      return <Page page={arg ?? ""} />;
  }
}

function Frame({ source, label, children }: { source: string; label: string; children: React.ReactNode }) {
  return (
    <section className="live-block my-6" data-live={label}>
      {children}
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
        <span aria-hidden>🔄</span>
        <span>채용 사이트에서 자동으로 가져옵니다 (1시간마다 갱신).</span>
        <a href={source} target="_blank" rel="noreferrer" className="text-ink-2 underline underline-offset-2 hover:text-ink">
          원문 보기 ↗
        </a>
      </p>
    </section>
  );
}

function Unavailable({ source, label }: { source: string; label: string }) {
  return (
    <aside className="callout callout-warning my-6" data-emoji="⚠️" role="note">
      <p>
        <strong>{label}</strong>을(를) 채용 사이트에서 불러오지 못했습니다. 잠시 뒤 다시 열어보거나 원문을 직접 확인해주세요.{" "}
        <a href={source} target="_blank" rel="noreferrer">
          원문 보기 ↗
        </a>
      </p>
    </aside>
  );
}

async function Letters() {
  const source = `${NINEHIRE_SITE}/letter`;
  const items = await getNinehireLetters();
  if (!items) return <Unavailable source={source} label="열일레터 목록" />;
  return (
    <Frame source={source} label="열일레터">
      <ul className="live-list grid gap-3 sm:grid-cols-2">
        {items.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-3 rounded-[14px] border border-hairline bg-surface p-3 no-underline shadow-soft transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-lift"
            >
              {l.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-[10px] object-cover" />
              ) : (
                <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-2xl">
                  💌
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium text-ink group-hover:text-accent">{l.title || "열일레터"}</span>
                <span className="block text-[12px] text-ink-3">네이버 블로그에서 읽기 ↗</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

async function News() {
  const source = `${NINEHIRE_SITE}/news`;
  const items = await getNinehireNews();
  if (!items) return <Unavailable source={source} label="뉴스 목록" />;
  return (
    <Frame source={source} label="뉴스">
      <ul className="live-list divide-y divide-hairline">
        {items.map((n, i) => (
          <li key={`${n.href ?? n.title}-${i}`} className="py-2.5">
            {n.href ? (
              <a href={n.href} target="_blank" rel="noreferrer" className="text-[15px] font-medium text-ink no-underline hover:text-accent">
                {n.title} <span aria-hidden>↗</span>
              </a>
            ) : (
              <span className="text-[15px] font-medium text-ink">{n.title}</span>
            )}
            {n.meta ? <div className="mt-0.5 text-[12.5px] text-ink-3">{n.meta}</div> : null}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

async function Positions() {
  const source = `${NINEHIRE_SITE}/career`;
  const items = await getNinehirePositions();
  if (!items) return <Unavailable source={source} label="채용 중인 포지션" />;
  const open = items.filter((p) => !p.isPool);
  const pool = items.find((p) => p.isPool);
  return (
    <Frame source={source} label="채용 중인 포지션">
      <p className="mb-2 text-[14px] text-ink-2">
        진행 중인 공고 <strong className="text-ink">{open.length}건</strong>
        {pool ? (
          <>
            {" · "}
            <a href={pool.href} target="_blank" rel="noreferrer">
              상시 인재풀 ↗
            </a>
          </>
        ) : null}
      </p>
      {open.length ? (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>소속</th>
                <th>포지션</th>
                <th>직군</th>
                <th>경력</th>
                <th>고용 형태</th>
              </tr>
            </thead>
            <tbody>
              {open.map((p) => (
                <tr key={p.key}>
                  <td className="whitespace-nowrap">{p.company}</td>
                  <td>
                    <a href={p.href} target="_blank" rel="noreferrer" className="font-medium">
                      {p.title} ↗
                    </a>
                  </td>
                  <td className="whitespace-nowrap">{p.jobGroup}</td>
                  <td className="whitespace-nowrap">{p.career}</td>
                  <td>{p.employment}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[14px] text-ink-3">지금은 진행 중인 공고가 없습니다.</p>
      )}
    </Frame>
  );
}

async function Page({ page }: { page: string }) {
  const source = ninehirePageUrl(page || "home");
  const data = page ? await getNinehirePage(page) : null;
  if (!data) return <Unavailable source={source} label={liveLabel("ninehire-page", page || null)} />;
  return (
    <Frame source={source} label={data.title}>
      <div className="live-page">
        {data.sections.map((blocks, i) => (
          <div key={i} className="live-section">
            {blocks.map((b, j) => (
              <Block key={j} block={b} />
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Block({ block }: { block: NhBlock }) {
  switch (block.kind) {
    case "heading":
      return <h3>{block.text.replace(/\n/g, " ")}</h3>;
    case "text": {
      const lines = block.text.split("\n");
      // "제목\n설명" 꼴(복지 카드 등)은 첫 줄을 굵게
      if (lines.length > 1 && lines[0].length <= 30) {
        return (
          <p>
            <strong>{lines[0]}</strong>
            <br />
            {lines.slice(1).join(" ")}
          </p>
        );
      }
      return <p>{lines.join(" ")}</p>;
    }
    case "link":
      return (
        <p>
          <a href={block.href} target="_blank" rel="noreferrer" className="btn-secondary h-9 px-4 text-[13.5px] no-underline">
            {block.text} ↗
          </a>
        </p>
      );
    case "cards":
      return (
        <ul>
          {block.items.map((it, i) => (
            <li key={i}>
              {it.href ? (
                <a href={it.href} target="_blank" rel="noreferrer">
                  {it.title || it.href} ↗
                </a>
              ) : (
                it.title
              )}
            </li>
          ))}
        </ul>
      );
  }
}
