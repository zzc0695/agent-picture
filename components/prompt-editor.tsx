"use client";

import { useState } from "react";

export function PromptEditor({
  value,
  onChange,
  testTemplate,
}: {
  value: string;
  onChange: (value: string) => void;
  testTemplate?: string;
}) {
  const [localValue, setLocalValue] = useState(value);
  const template =
    testTemplate ??
    "保留原房间结构和窗户位置，搭配窗帘样本图中的颜色、纹理和垂感，生成真实摄影质感效果图。";

  function update(next: string) {
    setLocalValue(next);
    onChange(next);
  }

  return (
    <section className="space-y-3 rounded-[10px] border border-neutral-200 bg-white p-4 shadow-[0_10px_30px_rgba(31,41,55,0.05)]">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold" htmlFor="prompt">
          生成要求
        </label>
        <span className="rounded-full bg-[#edf6f3] px-2.5 py-1 text-xs text-[#1e6d67]">
          模板
        </span>
      </div>
      <textarea
        id="prompt"
        aria-label="生成要求"
        value={localValue}
        onChange={(event) => update(event.target.value)}
        className="min-h-44 w-full resize-none rounded-lg border border-neutral-200 bg-[#fbfcfb] p-3 text-base leading-7 outline-none transition focus:border-[#2b8178] focus:ring-4 focus:ring-[#dcefeb]"
        placeholder="请描述想要的窗帘效果、风格、材质、光线和需要保留的房间细节"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
          onClick={() =>
            update(`${localValue}${localValue ? "\n" : ""}${template}`)
          }
        >
          插入模板
        </button>
        <button
          type="button"
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700"
          onClick={() => update(template)}
        >
          替换整段
        </button>
      </div>
    </section>
  );
}
