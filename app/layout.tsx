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
          <aside className="sidebar">
            <div className="brand" style={{ display: "flex", alignItems: "center", minHeight: "36px", marginBottom: "18px" }}>
              <img src="/logo.png" alt="Thailand Humanoid Atlas" style={{ maxHeight: "36px", maxWidth: "100%", width: "auto", objectFit: "contain" }} />
            </div>
            <SidebarNav currentLang={lang} />
            <LanguageSelector currentLang={lang} />
          </aside>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}

