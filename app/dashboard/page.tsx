import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  let data = {
    locations: [] as any[],
    robotTypes: [] as any[],
    sourceTypes: [] as any[],
    embodimentLevels: [] as any[],
    contributionTypes: [] as any[],
    themes: [] as any[],
    highConfidenceAnn: 0,
    medConfidenceAnn: 0,
    lowConfidenceAnn: 0,
    highConfidenceSrc: 0,
    medConfidenceSrc: 0,
    lowConfidenceSrc: 0,
    dbOffline: false
  };

  try {
    const [
      locations,
      robotTypes,
      sourceTypes,
      embodimentLevels,
      contributionTypes,
      themes,
      highConfidenceAnn,
      medConfidenceAnn,
      lowConfidenceAnn,
      highConfidenceSrc,
      medConfidenceSrc,
      lowConfidenceSrc
    ] = await Promise.all([
      prisma.robotModel.groupBy({ by: ["countryOfOrigin"], _count: { _all: true } }),
      prisma.robotModel.groupBy({ by: ["robotType"], _count: { _all: true } }),
      prisma.sourceRecord.groupBy({ by: ["sourceType"], _count: { _all: true } }),
      prisma.robotModel.groupBy({ by: ["embodimentLevel"], _count: { _all: true } }),
      prisma.contribution.groupBy({ by: ["contributionType"], _count: { _all: true } }),
      prisma.perspectiveAnnotation.groupBy({ by: ["perspectiveTheme"], _count: { _all: true } }),
      // Confidence buckets
      prisma.perspectiveAnnotation.count({ where: { confidence: { gte: 0.8 } } }),
      prisma.perspectiveAnnotation.count({ where: { confidence: { gte: 0.5, lt: 0.8 } } }),
      prisma.perspectiveAnnotation.count({ where: { confidence: { lt: 0.5 } } }),
      prisma.sourceRecord.count({ where: { relevanceConfidence: { gte: 0.8 } } }),
      prisma.sourceRecord.count({ where: { relevanceConfidence: { gte: 0.5, lt: 0.8 } } }),
      prisma.sourceRecord.count({ where: { relevanceConfidence: { lt: 0.5 } } })
    ]);

    data = {
      locations,
      robotTypes,
      sourceTypes,
      embodimentLevels,
      contributionTypes,
      themes,
      highConfidenceAnn,
      medConfidenceAnn,
      lowConfidenceAnn,
      highConfidenceSrc,
      medConfidenceSrc,
      lowConfidenceSrc,
      dbOffline: false
    };
  } catch (error) {
    console.error("Database connection failed in dashboard, using fallback data:", error);
    data = {
      locations: [
        { countryOfOrigin: "Thailand", _count: { _all: 3 } },
        { countryOfOrigin: "Japan", _count: { _all: 2 } },
        { countryOfOrigin: "United States", _count: { _all: 1 } }
      ],
      robotTypes: [
        { robotType: "humanoid", _count: { _all: 4 } },
        { robotType: "social", _count: { _all: 2 } }
      ],
      sourceTypes: [
        { sourceType: "news_article", _count: { _all: 98 } },
        { sourceType: "social_media", _count: { _all: 34 } },
        { sourceType: "academic_paper", _count: { _all: 22 } }
      ],
      embodimentLevels: [
        { embodimentLevel: "full_humanoid", _count: { _all: 3 } },
        { embodimentLevel: "upper_body", _count: { _all: 2 } },
        { embodimentLevel: "wheeled_base", _count: { _all: 1 } }
      ],
      contributionTypes: [
        { contributionType: "code_repository", _count: { _all: 5 } },
        { contributionType: "research_paper", _count: { _all: 3 } }
      ],
      themes: [
        { perspectiveTheme: "economic_impact", _count: { _all: 15 } },
        { perspectiveTheme: "safety_concern", _count: { _all: 8 } },
        { perspectiveTheme: "technological_advancement", _count: { _all: 22 } }
      ],
      highConfidenceAnn: 8,
      medConfidenceAnn: 3,
      lowConfidenceAnn: 1,
      highConfidenceSrc: 110,
      medConfidenceSrc: 32,
      lowConfidenceSrc: 12,
      dbOffline: true
    };
  }

  // Helper to calculate total count for percentages
  const sumCounts = (arr: { _count: { _all: number } }[]) => 
    arr.reduce((acc, curr) => acc + curr._count._all, 0);

  const locTotal = sumCounts(data.locations);
  const typeTotal = sumCounts(data.robotTypes);
  const srcTotal = sumCounts(data.sourceTypes);
  const embTotal = sumCounts(data.embodimentLevels);
  const contribTotal = sumCounts(data.contributionTypes);
  const themeTotal = sumCounts(data.themes);

  const totalAnnotations = data.highConfidenceAnn + data.medConfidenceAnn + data.lowConfidenceAnn;
  const totalSources = data.highConfidenceSrc + data.medConfidenceSrc + data.lowConfidenceSrc;

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.dashboardTitle}</h1>
          <p className="muted">
            {t.dashboardDesc}
          </p>
        </div>
      </div>

      {data.dbOffline && (
        <div className="notice" style={{ backgroundColor: "#fffbeb", borderLeftColor: "var(--warning)", marginBottom: "16px" }}>
          <strong>⚠️ Database Offline:</strong> Live PostgreSQL connection is unavailable (normal for Vercel preview environments). Displaying high-fidelity simulated research analytics.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginTop: "12px" }}>
        
        {/* Location Distribution */}
        <section className="panel">
          <h2>Robot Origin Locations</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.locations.map((loc) => {
              const count = loc._count._all;
              const pct = locTotal > 0 ? (count / locTotal) * 100 : 0;
              return (
                <div key={loc.countryOfOrigin || "unknown"}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span>{loc.countryOfOrigin || "Unknown"}</span>
                    <strong>{count} ({pct.toFixed(1)}%)</strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
            {!data.locations.length && <div className="empty">No location statistics available.</div>}
          </div>
        </section>

        {/* Robot Categories */}
        <section className="panel">
          <h2>Robot Categories</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.robotTypes.map((type) => {
              const count = type._count._all;
              const pct = typeTotal > 0 ? (count / typeTotal) * 100 : 0;
              return (
                <div key={type.robotType}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ textTransform: "capitalize" }}>{type.robotType.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(1)}%)</strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
            {!data.robotTypes.length && <div className="empty">No category statistics available.</div>}
          </div>
        </section>

        {/* Source Record Types */}
        <section className="panel">
          <h2>Source Record Types</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.sourceTypes.map((st) => {
              const count = st._count._all;
              const pct = srcTotal > 0 ? (count / srcTotal) * 100 : 0;
              return (
                <div key={st.sourceType}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ textTransform: "capitalize" }}>{st.sourceType.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(1)}%)</strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
            {!data.sourceTypes.length && <div className="empty">No source types statistics available.</div>}
          </div>
        </section>

        {/* Embodiment Level */}
        <section className="panel">
          <h2>Robot Embodiment Levels</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.embodimentLevels.map((el) => {
              const count = el._count._all;
              const pct = embTotal > 0 ? (count / embTotal) * 100 : 0;
              return (
                <div key={el.embodimentLevel}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ textTransform: "capitalize" }}>{el.embodimentLevel.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(1)}%)</strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
            {!data.embodimentLevels.length && <div className="empty">No embodiment levels statistics available.</div>}
          </div>
        </section>

        {/* Contribution Type */}
        <section className="panel">
          <h2>Contribution Types</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.contributionTypes.map((ct) => {
              const count = ct._count._all;
              const pct = contribTotal > 0 ? (count / contribTotal) * 100 : 0;
              return (
                <div key={ct.contributionType}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ textTransform: "capitalize" }}>{ct.contributionType.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(1)}%)</strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
            {!data.contributionTypes.length && <div className="empty">No contribution type statistics available.</div>}
          </div>
        </section>

        {/* Perspective Themes */}
        <section className="panel">
          <h2>Perspective Themes</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.themes.map((th) => {
              const count = th._count._all;
              const pct = themeTotal > 0 ? (count / themeTotal) * 100 : 0;
              return (
                <div key={th.perspectiveTheme}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ textTransform: "capitalize" }}>{th.perspectiveTheme.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(1)}%)</strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }} />
                  </div>
                </div>
              );
            })}
            {!data.themes.length && <div className="empty">No theme statistics available.</div>}
          </div>
        </section>

      </div>

      {/* Confidence Score Buckets */}
      <h2 style={{ marginTop: "24px" }}>Extracted Confidence Distribution</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
        
        {/* Perspective Confidence Distribution */}
        <section className="panel">
          <h2>Perspective Annotations (total: {totalAnnotations})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>High (Confidence &ge; 0.8)</span>
                <strong>{data.highConfidenceAnn}</strong>
              </div>
              <div style={{ height: "6px", background: "var(--surface-muted)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalAnnotations > 0 ? (data.highConfidenceAnn / totalAnnotations) * 100 : 0}%`, height: "100%", background: "var(--success)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Moderate (0.5 &le; Confidence &lt; 0.8)</span>
                <strong>{data.medConfidenceAnn}</strong>
              </div>
              <div style={{ height: "6px", background: "var(--surface-muted)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalAnnotations > 0 ? (data.medConfidenceAnn / totalAnnotations) * 100 : 0}%`, height: "100%", background: "var(--warning)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Low (Confidence &lt; 0.5)</span>
                <strong>{data.lowConfidenceAnn}</strong>
              </div>
              <div style={{ height: "6px", background: "var(--surface-muted)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalAnnotations > 0 ? (data.lowConfidenceAnn / totalAnnotations) * 100 : 0}%`, height: "100%", background: "var(--low-confidence)" }} />
              </div>
            </div>
          </div>
        </section>

        {/* Source Relevance Confidence Distribution */}
        <section className="panel">
          <h2>Source Relevance Confidence (total: {totalSources})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>High (Confidence &ge; 0.8)</span>
                <strong>{data.highConfidenceSrc}</strong>
              </div>
              <div style={{ height: "6px", background: "var(--surface-muted)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalSources > 0 ? (data.highConfidenceSrc / totalSources) * 100 : 0}%`, height: "100%", background: "var(--success)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Moderate (0.5 &le; Confidence &lt; 0.8)</span>
                <strong>{data.medConfidenceSrc}</strong>
              </div>
              <div style={{ height: "6px", background: "var(--surface-muted)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalSources > 0 ? (data.medConfidenceSrc / totalSources) * 100 : 0}%`, height: "100%", background: "var(--warning)" }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Low (Confidence &lt; 0.5)</span>
                <strong>{data.lowConfidenceSrc}</strong>
              </div>
              <div style={{ height: "6px", background: "var(--surface-muted)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: `${totalSources > 0 ? (data.lowConfidenceSrc / totalSources) * 100 : 0}%`, height: "100%", background: "var(--low-confidence)" }} />
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
