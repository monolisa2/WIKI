"use client";

import { useState } from "react";

/** 연동 블록 탭: 패널은 서버에서 그려서 넘겨받고, 여기서는 보이는 탭만 바꾼다. */
export function LiveTabs({ tabs, panels }: { tabs: { key: string; label: string }[]; panels: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="live-tabs">
      <div role="tablist" aria-label="페이지" className="mb-4 flex flex-wrap gap-1.5 border-b border-hairline pb-3">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`h-9 rounded-full px-4 text-[14px] transition-colors ${
              i === active ? "bg-ink text-white font-medium" : "bg-black/[0.05] text-ink-2 hover:bg-black/[0.09] hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {panels.map((p, i) => (
        <div key={tabs[i]?.key ?? i} role="tabpanel" hidden={i !== active}>
          {p}
        </div>
      ))}
    </div>
  );
}
