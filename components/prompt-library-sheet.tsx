"use client";

export function PromptLibrarySheet({
  template,
  onInsert,
  onReplace,
}: {
  template: string;
  onInsert: (template: string) => void;
  onReplace: (template: string) => void;
}) {
  return (
    <section className="rounded-md border bg-white p-3">
      <h2 className="text-sm font-medium">提示词模板</h2>
      <p className="mt-2 text-sm text-neutral-600">{template}</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => onInsert(template)}
        >
          插入
        </button>
        <button
          type="button"
          className="rounded-md bg-neutral-950 px-3 py-2 text-sm text-white"
          onClick={() => onReplace(template)}
        >
          替换
        </button>
      </div>
    </section>
  );
}
