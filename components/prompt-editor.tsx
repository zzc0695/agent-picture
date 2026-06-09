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
    <section className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="prompt">
        生成要求
      </label>
      <textarea
        id="prompt"
        aria-label="生成要求"
        value={localValue}
        onChange={(event) => update(event.target.value)}
        className="min-h-40 w-full rounded-md border p-3 text-base"
        placeholder="请描述想要的窗帘效果、风格、材质、光线和需要保留的房间细节"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() =>
            update(`${localValue}${localValue ? "\n" : ""}${template}`)
          }
        >
          插入模板
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => update(template)}
        >
          替换整段
        </button>
      </div>
    </section>
  );
}
