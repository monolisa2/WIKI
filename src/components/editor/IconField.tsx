"use client";

import { ICON_CHOICES } from "@/lib/constants";

/** 문서 아이콘(이모지) 입력: 직접 입력 + 빠른 선택 */
export function IconField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label" htmlFor="icon">
        아이콘
      </label>
      <div className="flex items-start gap-2">
        <input
          id="icon"
          name="icon"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, 8))}
          className="input w-16! shrink-0 text-center text-[22px] leading-none"
          placeholder="📄"
          aria-label="아이콘 이모지"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-1">
          {ICON_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onChange(e)}
              aria-label={`아이콘 ${e}`}
              className={`flex h-8 w-8 items-center justify-center rounded-[8px] text-[17px] leading-none transition-colors ${
                value === e ? "bg-accent-soft ring-2 ring-accent-strong/40" : "hover:bg-black/[0.06]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-ink-2">홈 목록과 문서 상단에 보입니다. 비우면 유형별 기본 아이콘이 쓰입니다.</p>
    </div>
  );
}
