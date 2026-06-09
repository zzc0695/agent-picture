"use client";

export function FidelitySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: "strict" | "balanced" | "creative") => void;
}) {
  const options = [
    ["strict", "严格还原", "优先保持样本颜色、纹理、款式和材质"],
    ["balanced", "平衡", "保留主要风格并适配房间光线"],
    ["creative", "创意参考", "适合宣传图和氛围图"],
  ] as const;

  return (
    <section className="rounded-[10px] border border-neutral-200 bg-white p-4 shadow-[0_10px_30px_rgba(31,41,55,0.05)]">
      <div className="mb-3 flex items-center gap-1">
        <h2 className="text-sm font-semibold">还原度设置</h2>
        <span className="text-xs text-neutral-400">ⓘ</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map(([key, label, description]) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`min-h-24 rounded-lg border p-3 text-center transition ${
              value === key
                ? "border-[#2b8178] bg-[#edf6f3] text-[#1e6d67]"
                : "border-neutral-200 bg-white text-neutral-700"
            }`}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className="mt-2 block text-xs leading-5 text-neutral-500">
              {description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
