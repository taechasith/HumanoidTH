import type { Metadata } from "next";
import { cookies } from "next/headers";
import RobotConsoleClient from "./RobotConsoleClient";
import type { RobotLang } from "./copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Robot console | HRI Living Lab",
  description:
    "Read a real HRI Passport and watch two simulated robots apply the same profile within their own hardware.",
  alternates: { canonical: "/living-lab/robot" },
  robots: { index: false, follow: false }
};

export default async function RobotConsolePage() {
  const lang = (((await cookies()).get("lang")?.value === "th" ? "th" : "en") as RobotLang);
  return <RobotConsoleClient lang={lang} />;
}
