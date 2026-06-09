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
    <div className="grid gap-2">
      {options.map(([key, label, description]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-md border p-3 text-left ${
            value === key ? "border-neutral-950" : "border-neutral-200"
          }`}
        >
          <span className="block font-medium">{label}</span>
          <span className="text-sm text-neutral-500">{description}</span>
        </button>
      ))}
    </div>
  );
}
