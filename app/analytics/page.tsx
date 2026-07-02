import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const [themes, statuses] = await Promise.all([
    prisma.perspectiveAnnotation.groupBy({ by: ["perspectiveTheme"], _count: { _all: true } }),
    prisma.sourceRecord.groupBy({ by: ["relevanceStatus"], _count: { _all: true } })
  ]);

  return (
    <>
      <h1>{t.analyticsTitle}</h1>
      <p className="muted" style={{ marginBottom: "18px" }}>{t.analyticsDesc}</p>
      <div className="notice">Trends and correlations are descriptive signals only, not causal claims.</div>
      <h2>Perspective Themes</h2>

      <section className="grid">
        {themes.map((row) => (
          <div className="panel" key={row.perspectiveTheme}><div className="muted">{row.perspectiveTheme}</div><div className="stat">{row._count._all}</div></div>
        ))}
        {!themes.length && <div className="panel">Insufficient perspective data.</div>}
      </section>
      <h2 style={{ marginTop: 18 }}>Relevance Status</h2>
      <section className="grid">
        {statuses.map((row) => (
          <div className="panel" key={row.relevanceStatus}><div className="muted">{row.relevanceStatus}</div><div className="stat">{row._count._all}</div></div>
        ))}
      </section>
    </>
  );
}
