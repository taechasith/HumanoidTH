"use client";

import { useEffect, useRef } from "react";
import { Search, Command } from "lucide-react";

export default function GlobalSearch({ compact = false, lang = "en" }: { compact?: boolean; lang?: "en" | "th" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (inputRef.current?.offsetParent !== null) inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  const placeholder = lang === "th" ? "ค้นหาหุ่นยนต์ แหล่งข้อมูล และงานวิจัย..." : "Search robots, sources, research…";
  return <form action="/search" method="GET" className={`global-search${compact ? " global-search--compact" : ""}`} role="search">
    <Search size={18} aria-hidden="true" />
    <label className="sr-only" htmlFor={compact ? "global-search-mobile" : "global-search-desktop"}>{lang === "th" ? "ค้นหาหุ่นยนต์ แหล่งข้อมูล และงานวิจัย" : "Search robots, sources, and research"}</label>
    <input ref={inputRef} id={compact ? "global-search-mobile" : "global-search-desktop"} name="q" type="search" placeholder={placeholder} autoComplete="off" />
    {!compact && <span className="global-search__shortcut"><Command size={12} aria-hidden="true" /> K</span>}
  </form>;
}
