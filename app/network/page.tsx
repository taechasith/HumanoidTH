import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";
import NetworkGraphClient from "./NetworkGraphClient";

export const dynamic = "force-dynamic";

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
