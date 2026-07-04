import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getTranslation } from "@/lib/translations";
import NetworkGraphClient from "./NetworkGraphClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Humanoid Robotics Relationship Network",
  description: "Interactive relationship graph connecting Thailand humanoid robots, organizations, inventory, papers, sources, public perspectives, and contributions.",
  alternates: { canonical: "/network" }
};

export default async function NetworkPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.networkTitle}</h1>
          <p className="muted">{t.networkDesc}</p>
        </div>
      </div>
      <NetworkGraphClient lang={lang} />
    </>
  );
}
