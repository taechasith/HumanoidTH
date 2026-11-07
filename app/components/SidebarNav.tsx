"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bot, Database, FileText, GitPullRequest, Home, LayoutDashboard,
  MapPinned, Network, Package, Send, Settings2, UsersRound
} from "lucide-react";

type Props = { currentLang?: "en" | "th"; currentRole?: string };

export default function SidebarNav({ currentLang = "en", currentRole }: Props) {
  const pathname = usePathname() || "/";
  const th = currentLang === "th";
  const groups = [
    { label: th ? "พื้นที่ทำงาน" : "WORKSPACE", items: [
      { href: "/", label: th ? "ภาพรวม" : "Overview", icon: Home },
      { href: "/dashboard", label: th ? "แดชบอร์ด" : "Dashboard", icon: LayoutDashboard },
    ] },
    { label: th ? "สำรวจข้อมูล" : "EXPLORE DATA", items: [
      { href: "/robots", label: th ? "Robot models" : "Robot models", icon: Bot },
      { href: "/database", label: th ? "ฐานข้อมูล" : "Evidence database", icon: Database },
      { href: "/map", label: th ? "แผนที่ระบบนิเวศ" : "Ecosystem map", icon: MapPinned },
      { href: "/network", label: th ? "เครือข่าย" : "Knowledge graph", icon: Network },
    ] },
    { label: th ? "วิเคราะห์และชุมชน" : "INSIGHTS & COMMUNITY", items: [
      { href: "/analytics", label: th ? "Analytics" : "Analytics", icon: BarChart3 },
      { href: "/perspectives", label: th ? "มุมมองวิจัย" : "Research perspectives", icon: FileText },
      { href: "/contributions", label: th ? "ชุมชนผู้ร่วมให้ข้อมูล" : "Contributors", icon: UsersRound },
      { href: "/submit-data", label: th ? "ส่งข้อมูล" : "Submit data", icon: Send },
      { href: "/inventory", label: th ? "คลังหุ่นยนต์" : "Robot inventory", icon: Package },
    ] },
    ...(currentRole === "ADMIN" ? [{ label: th ? "ผู้ดูแลระบบ" : "ADMINISTRATION", items: [
      { href: "/data-pulls", label: th ? "ดึงข้อมูล" : "Data pulls", icon: GitPullRequest },
      { href: "/admin", label: th ? "คิวตรวจสอบ" : "Review queue", icon: Settings2 },
    ] }] : []),
  ];
  const isActive = (href: string) => href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return <aside className="workspace-sidebar" aria-label={th ? "เมนูหลัก" : "Primary navigation"}>
    <div className="workspace-sidebar__scroll">
      {groups.map((group) => <section className="workspace-sidebar__group" key={group.label}>
        <h2>{group.label}</h2>
        <nav aria-label={group.label}>{group.items.map(({ href, label, icon: Icon }) => <Link href={href} key={href} className={isActive(href) ? "active" : ""} aria-current={isActive(href) ? "page" : undefined}>
          <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>{href === "/robots" && <span className="workspace-sidebar__tag">Atlas</span>}
        </Link>)}</nav>
      </section>)}
    </div>
    <div className="workspace-sidebar__footer"><span className="workspace-sidebar__pulse" />{th ? "เชื่อมต่อข้อมูล Atlas" : "Atlas data connected"}<small>{th ? "ฐานข้อมูลสาธารณะ" : "Public research workspace"}</small></div>
  </aside>;
}
