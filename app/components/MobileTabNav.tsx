"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Bot,
  Settings2,
  CircleUserRound,
  Inbox,
  Package,
  Send,
  ClipboardList,
  CheckSquare
} from "lucide-react";

export default function MobileTabNav() {
  const pathname = usePathname() || "/";

  // Determine which navigation set to display based on the current path
  let tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/robots", label: "Robots", icon: Bot },
    { href: "/admin/submitted-data", label: "Admin", icon: Settings2 },
    { href: "/profile", label: "Profile", icon: CircleUserRound }
  ];

  if (pathname.startsWith("/admin")) {
    tabs = [
      { href: "/admin/submitted-data", label: "Queue", icon: ClipboardList },
      { href: "/admin/submitted-data", label: "Review", icon: CheckSquare },
      { href: "/admin/cms", label: "CMS", icon: Settings2 },
      { href: "/profile", label: "Profile", icon: CircleUserRound }
    ];
  } else if (pathname === "/robots" || pathname === "/inventory") {
    tabs = [
      { href: "/", label: "Overview", icon: Home },
      { href: "/robots", label: "Robots", icon: Bot },
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/profile", label: "Profile", icon: CircleUserRound }
    ];
  } else if (pathname === "/dashboard") {
    tabs = [
      { href: "/", label: "Overview", icon: Home },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/submit-data", label: "Submit", icon: Send },
      { href: "/profile", label: "Profile", icon: CircleUserRound }
    ];
  } else if (pathname === "/data-pulls") {
    tabs = [
      { href: "/", label: "Overview", icon: Home },
      { href: "/data-pulls", label: "Data Pulls", icon: Inbox },
      { href: "/robots", label: "Robots", icon: Bot },
      { href: "/admin/submitted-data", label: "Admin", icon: Settings2 }
    ];
  }

  return (
    <nav className="mobile-tab-nav">
      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        // Simple path checking: active if exact match, or if not "/" and pathname starts with tab.href
        // Special case: for duplicate hrefs (e.g. Queue and Review both lead to /admin/submitted-data), we activate the first one
        const isExact = pathname === tab.href;
        const isPrefix = tab.href !== "/" && pathname.startsWith(tab.href);
        const isActive = isExact || isPrefix;
        
        // Custom styling helper to distinguish multiple tabs with same href
        const isSecondSame = idx === 1 && tabs[0].href === tabs[1].href;
        const computedActive = isSecondSame ? false : isActive;

        return (
          <Link 
            key={`${tab.href}-${tab.label}`} 
            href={tab.href} 
            className={`tab-item ${computedActive ? "active" : ""}`}
          >
            <Icon size={20} className="tab-icon" />
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
