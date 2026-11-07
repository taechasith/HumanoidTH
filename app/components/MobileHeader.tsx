import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import GlobalSearch from "./GlobalSearch";

export default function MobileHeader({ currentLang = "en" }: { currentLang?: "en" | "th" }) {
  return (
    <header className="mobile-header">
      <Link href="/" className="mobile-brand">
        <img src="/logo.png" alt="Thailand Humanoid Atlas Logo" className="mobile-logo-img" />
        <span className="mobile-title">THAILAND HUMANOID ATLAS</span>
      </Link>
      <Link href="/profile" className="mobile-profile" aria-label="Open profile">
        <CircleUserRound size={22} className="profile-icon" />
        <span>Profile</span>
      </Link>
      <GlobalSearch compact lang={currentLang} />
    </header>
  );
}
