import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

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

  // Helper to calculate total count for percentages
  const sumCounts = (arr: { _count: { _all: number } }[]) => 
    arr.reduce((acc, curr) => acc + curr._count._all, 0);

  const locTotal = sumCounts(locations);
  const typeTotal = sumCounts(robotTypes);
  const srcTotal = sumCounts(sourceTypes);
  const embTotal = sumCounts(embodimentLevels);
  const contribTotal = sumCounts(contributionTypes);
  const themeTotal = sumCounts(themes);

  const totalAnnotations = highConfidenceAnn + medConfidenceAnn + lowConfidenceAnn;
  const totalSources = highConfidenceSrc + medConfidenceSrc + lowConfidenceSrc;

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


      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginTop: "12px" }}>
        
        {/* Location Distribution */}
        <section className="panel">
          <h2>Robot Origin Locations</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {locations.map((loc) => {
              const count = loc._count._all;
              const pct = locTotal > 0 ? (count / locTotal) * 100 : 0;
              return (
                <div key={loc.countryOfOrigin || "unknown"}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>{loc.countryOfOrigin || "Unspecified"}</span>
                    <strong>{count} ({pct.toFixed(0)}%)</strong>
                  </div>
                  <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: "100%", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            {!locations.length && <p className="empty">No location records available.</p>}
          </div>
        </section>

        {/* Embodiment Level */}
        <section className="panel">
          <h2>Embodiment Levels</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {embodimentLevels.map((emb) => {
              const count = emb._count._all;
              const pct = embTotal > 0 ? (count / embTotal) * 100 : 0;
              return (
                <div key={emb.embodimentLevel || "unknown"}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>{emb.embodimentLevel?.replace(/_/g, " ") || "Unspecified"}</span>
                    <strong>{count} ({pct.toFixed(0)}%)</strong>
                  </div>
                  <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: "100%", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            {!embodimentLevels.length && <p className="empty">No embodiment level records.</p>}
          </div>
        </section>

        {/* Source Type */}
        <section className="panel">
          <h2>Source Ingestion Types</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sourceTypes.map((src) => {
              const count = src._count._all;
              const pct = srcTotal > 0 ? (count / srcTotal) * 100 : 0;
              return (
                <div key={src.sourceType}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>{src.sourceType}</span>
                    <strong>{count} ({pct.toFixed(0)}%)</strong>
                  </div>
                  <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: "100%", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            {!sourceTypes.length && <p className="empty">No source records.</p>}
          </div>
        </section>

        {/* Robot Types */}
        <section className="panel">
          <h2>Robot Classifications</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {robotTypes.map((rt) => {
              const count = rt._count._all;
              const pct = typeTotal > 0 ? (count / typeTotal) * 100 : 0;
              return (
                <div key={rt.robotType}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>{rt.robotType.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(0)}%)</strong>
                  </div>
                  <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: "100%", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            {!robotTypes.length && <p className="empty">No robot classifications.</p>}
          </div>
        </section>

        {/* Contributions */}
        <section className="panel">
          <h2>Contribution Categories</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {contributionTypes.map((c) => {
              const count = c._count._all;
              const pct = contribTotal > 0 ? (count / contribTotal) * 100 : 0;
              return (
                <div key={c.contributionType}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>{c.contributionType.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(0)}%)</strong>
                  </div>
                  <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: "100%", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            {!contributionTypes.length && <p className="empty">No contributions records.</p>}
          </div>
        </section>

        {/* Perspective Themes */}
        <section className="panel">
          <h2>Perspective Themes Map</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {themes.map((t) => {
              const count = t._count._all;
              const pct = themeTotal > 0 ? (count / themeTotal) * 100 : 0;
              return (
                <div key={t.perspectiveTheme}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span>{t.perspectiveTheme.replace(/_/g, " ")}</span>
                    <strong>{count} ({pct.toFixed(0)}%)</strong>
                  </div>
                  <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                    <div style={{ background: "var(--accent)", width: `${pct}%`, height: "100%", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
            {!themes.length && <p className="empty">No perspective themes available.</p>}
          </div>
        </section>

        {/* Confidence Buckets */}
        <section className="panel" style={{ gridColumn: "span 1" }}>
          <h2>Perspective Confidence Buckets</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* High confidence */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>High Confidence (≥ 0.80)</span>
                <strong>{highConfidenceAnn} / {totalAnnotations}</strong>
              </div>
              <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                <div style={{ background: "var(--success)", width: `${totalAnnotations > 0 ? (highConfidenceAnn / totalAnnotations) * 100 : 0}%`, height: "100%", borderRadius: "4px" }} />
              </div>
            </div>

            {/* Medium confidence */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>Medium Confidence (0.50 - 0.79)</span>
                <strong>{medConfidenceAnn} / {totalAnnotations}</strong>
              </div>
              <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                <div style={{ background: "var(--low-confidence)", width: `${totalAnnotations > 0 ? (medConfidenceAnn / totalAnnotations) * 100 : 0}%`, height: "100%", borderRadius: "4px" }} />
              </div>
            </div>

            {/* Low confidence */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>Low Confidence (&lt; 0.50)</span>
                <strong>{lowConfidenceAnn} / {totalAnnotations}</strong>
              </div>
              <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                <div style={{ background: "var(--danger)", width: `${totalAnnotations > 0 ? (lowConfidenceAnn / totalAnnotations) * 100 : 0}%`, height: "100%", borderRadius: "4px" }} />
              </div>
            </div>
          </div>
        </section>
        
        {/* Source Relevance Confidence */}
        <section className="panel" style={{ gridColumn: "span 1" }}>
          <h2>Source Relevance Confidence</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* High confidence */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>High Confidence (≥ 0.80)</span>
                <strong>{highConfidenceSrc} / {totalSources}</strong>
              </div>
              <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                <div style={{ background: "var(--success)", width: `${totalSources > 0 ? (highConfidenceSrc / totalSources) * 100 : 0}%`, height: "100%", borderRadius: "4px" }} />
              </div>
            </div>

            {/* Medium confidence */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>Medium Confidence (0.50 - 0.79)</span>
                <strong>{medConfidenceSrc} / {totalSources}</strong>
              </div>
              <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                <div style={{ background: "var(--low-confidence)", width: `${totalSources > 0 ? (medConfidenceSrc / totalSources) * 100 : 0}%`, height: "100%", borderRadius: "4px" }} />
              </div>
            </div>

            {/* Low confidence */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span>Low Confidence (&lt; 0.50)</span>
                <strong>{lowConfidenceSrc} / {totalSources}</strong>
              </div>
              <div style={{ background: "var(--surface-muted)", borderRadius: "4px", height: "8px" }}>
                <div style={{ background: "var(--danger)", width: `${totalSources > 0 ? (lowConfidenceSrc / totalSources) * 100 : 0}%`, height: "100%", borderRadius: "4px" }} />
              </div>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
