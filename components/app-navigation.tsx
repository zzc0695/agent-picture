"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, History, Images, LayoutDashboard, MessageSquareText, Users, Gauge, CircleHelp } from "lucide-react";

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
  return items.map(({ href, label, icon: Icon }) => {
    const active = href === "/" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
    return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="studio-nav-link"><Icon size={16} strokeWidth={1.7} aria-hidden="true" />{label}</Link>;
  });
}
