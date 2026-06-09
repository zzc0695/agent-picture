import Link from "next/link";

const nav = [
  ["工作台", "/"],
  ["素材", "/materials"],
  ["方案", "/plans"],
  ["提示词", "/prompts"],
  ["记录", "/records"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-56 border-r bg-white p-4 md:block">
        <h1 className="text-lg font-semibold">软装 AI 工作台</h1>
        <nav className="mt-6 grid gap-1">
          {nav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-3 py-2 text-sm hover:bg-neutral-100"
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-4 md:ml-56 md:px-8">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t bg-white md:hidden">
        {nav.map(([label, href]) => (
          <Link key={href} href={href} className="px-2 py-3 text-center text-xs">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
