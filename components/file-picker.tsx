"use client";

import { useState } from "react";

export function FilePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
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
    <label className="block rounded-md border border-dashed p-4">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="mt-3 block w-full text-sm"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {busy ? <p className="mt-2 text-sm text-neutral-500">上传中...</p> : null}
      {value ? (
        <p className="mt-2 break-all text-xs text-neutral-500">{value}</p>
      ) : null}
    </label>
  );
}
