import type { Metadata } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Sans_Thai, Inter } from "next/font/google";
import SidebarNav from "./components/SidebarNav";
import LanguageSelector from "./components/LanguageSelector";
import MobileHeader from "./components/MobileHeader";
import MobileTabNav from "./components/MobileTabNav";
import DataPullFab from "./components/DataPullFab";
import FirstTimeLoader from "./components/FirstTimeLoader";
import { getTranslation } from "@/lib/translations";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-ibm-plex-sans-thai",
  weight: ["100", "200", "300", "400", "500", "600", "700"],
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
    <html lang={lang} className={`${inter.variable} ${ibmPlexSansThai.variable}`}>
      <body>
        <FirstTimeLoader />
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
          <main className="main motion-page">{children}</main>
          <DataPullFab />
          <MobileTabNav currentLang={lang} />
        </div>
      </body>
    </html>
  );
}
