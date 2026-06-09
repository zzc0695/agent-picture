"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

export function FilePicker({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  helper?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/files", { method: "POST", body: form });
    const body = await response.json();
    setBusy(false);

    if (response.ok) {
      onChange(body.url);
    }
  }

  return (
    <label className="block overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-[0_10px_30px_rgba(31,41,55,0.06)]">
      <span className="flex items-center justify-between px-4 pb-2 pt-4 text-sm font-semibold">
        {label}
        <span className="text-xs font-normal text-neutral-400">示例</span>
      </span>
      <span className="mx-4 block overflow-hidden rounded-lg border bg-neutral-100">
        {value ? (
          <img
            alt={label}
            src={value}
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <span className="flex aspect-[16/10] items-center justify-center bg-[linear-gradient(135deg,#f8faf9,#e9eeee)] px-6 text-center text-sm leading-6 text-neutral-500">
            {helper ?? "上传图片后在这里预览"}
          </span>
        )}
      </span>
      <span className="mx-4 my-3 flex items-center gap-3 text-sm">
        <span className="rounded-md bg-[#edf6f3] px-3 py-2 font-medium text-[#1e6d67]">
          选择文件
        </span>
        <span className="min-w-0 truncate text-neutral-500">
          {value ? "已选择图片" : "未选择文件"}
        </span>
      </span>
      <input
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {busy ? (
        <p className="px-4 pb-3 text-sm text-neutral-500">上传中...</p>
      ) : null}
      {value ? (
        <p className="break-all px-4 pb-3 text-xs text-neutral-500">{value}</p>
      ) : null}
    </label>
  );
}
