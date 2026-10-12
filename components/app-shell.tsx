import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import {
  Boxes,
  History,
  Images,
  LayoutDashboard,
  MessageSquareText,
  Users,
  Gauge,
  CircleHelp,
} from "lucide-react";

const navItems = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/materials", label: "素材", icon: Boxes },
  { href: "/plans", label: "方案", icon: Images },
  { href: "/customers", label: "客户", icon: Users },
  { href: "/prompts", label: "提示词", icon: MessageSquareText },
  { href: "/records", label: "记录", icon: History },
  { href: "/usage", label: "用量", icon: Gauge },
  { href: "/welcome", label: "使用指南", icon: CircleHelp },
];

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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="studio-nav-link">
                <Icon size={15} strokeWidth={1.7} />
                {item.label}
              </Link>
            );
          })}
          <LogoutButton />
        </nav>
        <main className="studio-main">{accountEmail && <p className="px-4 pt-3 text-xs text-stone-500">当前账号：{accountEmail} · 素材、客户与方案按账号独立保存</p>}{children}</main>
      </div>
    </div>
  );
}
