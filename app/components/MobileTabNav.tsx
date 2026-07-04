"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Network,
  Bot,
  CircleUserRound
} from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/network", label: "Network", icon: Network },
  { href: "/robots", label: "Robots", icon: Bot },
  { href: "/profile", label: "Profile", icon: CircleUserRound }
];

export default function MobileTabNav() {
  const pathname = usePathname() || "/";

  return (
    <nav className="mobile-tab-nav" aria-label="Primary mobile navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isExact = pathname === tab.href;
        const isPrefix = tab.href !== "/" && pathname.startsWith(`${tab.href}/`);
        const isAdminSection = tab.href === "/admin" && pathname.startsWith("/admin");
        const isActive = isExact || isPrefix;

        return (
          <Link 
            key={`${tab.href}-${tab.label}`} 
            href={tab.href} 
            className={`tab-item ${isActive || isAdminSection ? "active" : ""}`}
            aria-current={isActive || isAdminSection ? "page" : undefined}
          >
            <Icon size={20} className="tab-icon" />
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
