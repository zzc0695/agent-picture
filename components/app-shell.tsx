import { AppNavigation } from "@/components/app-navigation";
import { LogoutButton } from "@/components/logout-button";

export function AppShell({ children, accountEmail }: { children: React.ReactNode; accountEmail?: string }) {
  return (
    <div className="studio-app">
      <div className="studio-noise" />
      <div className="studio-shell">
        <nav aria-label="主导航" className="studio-nav">
          <div className="hidden px-2 pb-4 sm:block">
            <p className="font-serif text-[18px] font-medium text-stone-800">
              AI 软装
            </p>
            <p className="mt-1 text-[10px] font-medium tracking-widest text-stone-400">
              DESIGN STUDIO
            </p>
          </div>
          <AppNavigation />
          <div className="desktop-navigation"><LogoutButton /></div>
        </nav>
        <main className="studio-main">{accountEmail && <p className="px-4 pt-3 text-xs text-stone-500">当前账号：{accountEmail} · 素材、客户与方案按账号独立保存</p>}{children}</main>
      </div>
    </div>
  );
}
