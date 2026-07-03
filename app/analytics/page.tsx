import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";
import AnalyticsCharts from "./AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  let themes: Array<{ perspectiveTheme: string; _count: { _all: number } }> = [];
  let statuses: Array<{ relevanceStatus: string; _count: { _all: number } }> = [];
  let dbOffline = false;

  try {
    [themes, statuses] = await Promise.all([
      prisma.perspectiveAnnotation.groupBy({ by: ["perspectiveTheme"], _count: { _all: true } }),
      prisma.sourceRecord.groupBy({ by: ["relevanceStatus"], _count: { _all: true } })
    ]);
  } catch (error) {
    console.error("Database query failed in analytics page:", error);
    dbOffline = true;
    themes = [
      { perspectiveTheme: "healthcare_and_eldercare_trust", _count: { _all: 3 } },
      { perspectiveTheme: "education_and_learning", _count: { _all: 2 } }
    ];
    statuses = [
      { relevanceStatus: "ACCEPTED", _count: { _all: 5 } },
      { relevanceStatus: "UNCERTAIN", _count: { _all: 1 } }
    ];
  }

  return (
    <>
      <h1>{t.analyticsTitle}</h1>
      <p className="muted" style={{ marginBottom: "18px" }}>{t.analyticsDesc}</p>
      <div className="notice">Trends and correlations are descriptive signals only, not causal claims.</div>
      {dbOffline && (
        <div className="notice" style={{ marginBottom: 16 }}>
          Live analytics are unavailable. Showing sample aggregate examples.
        </div>
      )}
      <div className="grid" style={{ margin: "18px 0" }}>
        <div className="panel">
          <div className="muted">Perspective Themes</div>
          <div className="stat">{themes.reduce((sum, row) => sum + row._count._all, 0)}</div>
        </div>
        <div className="panel">
          <div className="muted">Source Relevance Records</div>
          <div className="stat">{statuses.reduce((sum, row) => sum + row._count._all, 0)}</div>
        </div>
        <div className="panel">
          <div className="muted">Top Theme</div>
          <div className="stat">{themes[0]?.perspectiveTheme?.replace(/_/g, " ") ?? "N/A"}</div>
        </div>
        <div className="panel">
          <div className="muted">Top Status</div>
          <div className="stat">{statuses[0]?.relevanceStatus ?? "N/A"}</div>
        </div>
      </div>

      <AnalyticsCharts themes={themes} statuses={statuses} />
    </>
  );
}
