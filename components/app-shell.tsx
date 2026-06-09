export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f1ed] text-neutral-950">
      <main className="min-h-screen">{children}</main>
    </div>
  );
}
