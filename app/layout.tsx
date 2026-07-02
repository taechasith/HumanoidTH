import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import SidebarNav from "./components/SidebarNav";
import LanguageSelector from "./components/LanguageSelector";
import { getTranslation } from "@/lib/translations";
import "./globals.css";

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
    <html lang={lang} className={`${inter.variable} ${notoSansThai.variable}`}>
      <body>
        <div className="app-shell">
          <aside className="sidebar" style={{ display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: "0" }}>
            <div className="brand" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
              <img src="/logo.png" alt="Thailand Humanoid Atlas Logo" style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px", border: "1px solid #14352a" }} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", color: "#a5b4fc" }}>Thailand</span>
                <span style={{ fontSize: "14px", fontWeight: "800", color: "#EAB308" }}>Humanoid Atlas</span>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "4px" }}>
              <SidebarNav currentLang={lang} />
            </div>
            <div style={{ paddingTop: "14px", borderTop: "1px solid #14352a", marginTop: "auto" }}>
              <LanguageSelector currentLang={lang} />
            </div>
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

