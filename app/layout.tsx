import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Literata, Inter, Noto_Sans_Thai } from "next/font/google";
import SidebarNav from "./components/SidebarNav";
import LanguageSelector from "./components/LanguageSelector";
import MobileHeader from "./components/MobileHeader";
import MobileTabNav from "./components/MobileTabNav";
import DataPullFab from "./components/DataPullFab";
import { getTranslation } from "@/lib/translations";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-noto-sans-thai",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thailand Humanoid Atlas",
  description: "Research database for Thailand humanoid and social robotics ecosystem"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  return (
    <html lang={lang} className={`${literata.variable} ${inter.variable} ${notoSansThai.variable}`}>
      <body>
        <div className="app-shell">
          <MobileHeader />
          <aside className="sidebar">
            <div className="brand-logo-container">
              <img src="/logo.png" alt="Thailand Humanoid Atlas" className="brand-logo" />
            </div>
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
              <SidebarNav currentLang={lang} />
            </div>
            <div style={{ paddingTop: "14px", borderTop: "1px solid #14352a", marginTop: "auto" }}>
              <LanguageSelector currentLang={lang} />
            </div>
          </aside>
          <main className="main">{children}</main>
          <DataPullFab />
          <MobileTabNav />
        </div>
      </body>
    </html>
  );
}

