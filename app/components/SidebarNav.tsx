"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  CircleUserRound,
  Database,
  Inbox,
  LayoutDashboard,
  Network,
  Newspaper,
  Send,
  Settings2,
  UsersRound,
  Home,
  Package
} from "lucide-react";
import { getTranslation } from "@/lib/translations";

interface SidebarNavProps {
  currentLang?: "en" | "th";
}

export default function SidebarNav({ currentLang = "en" }: SidebarNavProps) {
  const pathname = usePathname();
  const t = getTranslation(currentLang);

  const navItems = [
    { href: "/", label: t.overview, icon: Home },
    { href: "/dashboard", label: t.dashboard, icon: LayoutDashboard },
    { href: "/data-pulls", label: t.dataPulls, icon: Inbox },
    { href: "/perspectives", label: t.perspectives, icon: Newspaper },
    { href: "/robots", label: t.robots, icon: Bot },
    { href: "/inventory", label: t.inventory, icon: Package },
    { href: "/contributions", label: t.contributors, icon: UsersRound },
    { href: "/network", label: t.network, icon: Network },
    { href: "/analytics", label: t.analytics, icon: BarChart3 },
    { href: "/database", label: t.database, icon: Database },
    { href: "/submit-data", label: t.submit, icon: Send },
    { href: "/admin/submitted-data", label: t.admin, icon: Settings2 },
    { href: "/admin/cms", label: t.cms, icon: Settings2 },
    { href: "/profile", label: t.profile, icon: CircleUserRound }
  ];

  return (
    <nav className="nav" aria-label="Primary">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href} 
            className={isActive ? "active" : ""}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
