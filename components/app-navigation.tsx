"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, History, Images, LayoutDashboard, MessageSquareText, Users, Gauge, CircleHelp, Ellipsis } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";

const items = [
  { href: "/", label: "工作台", icon: LayoutDashboard },
  { href: "/materials", label: "素材", icon: Boxes },
  { href: "/plans", label: "方案", icon: Images },
  { href: "/customers", label: "客户", icon: Users },
  { href: "/prompts", label: "提示词", icon: MessageSquareText },
  { href: "/records", label: "记录", icon: History },
  { href: "/usage", label: "用量", icon: Gauge },
  { href: "/welcome", label: "使用指南", icon: CircleHelp },
];

export function AppNavigation() {
  const pathname = usePathname();
  const links = items.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="studio-nav-link" onClick={event => event.currentTarget.closest("details")?.removeAttribute("open")}><Icon size={18} strokeWidth={1.7} aria-hidden="true" />{label}</Link>;
  });
  return <><div className="desktop-navigation">{links}</div><div className="mobile-navigation">{links.slice(0,4)}<details key={pathname} className="mobile-more" onKeyDown={event => { if (event.key === "Escape") { event.currentTarget.removeAttribute("open"); event.currentTarget.querySelector("summary")?.focus(); } }}><summary className="studio-nav-link" data-active={items.slice(4).some(item => pathname === item.href)}><Ellipsis size={20} aria-hidden="true" />更多</summary><div className="mobile-more-panel"><p className="px-3 py-2 text-xs text-stone-500">更多功能</p>{links.slice(4)}<LogoutButton /></div></details></div></>;
}
