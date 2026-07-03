import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import RobotViewer from "./components/RobotViewer";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  let sourcesCount = 154;
  let acceptedCount = 132;
  let robotsCount = 3;
  let contributionsCount = 8;
  let inventoryCount = 2;
  let pendingReviewsCount = 1;
  let platforms: any[] = [
    { platform: "Facebook", _count: { _all: 84 } },
    { platform: "Youtube", _count: { _all: 41 } },
    { platform: "Website", _count: { _all: 29 } }
  ];
  let yearRangeStr = "2020 – 2026";
  let latestPipelineRun: any = { pipelineName: "RSS Ingestion", status: "SUCCEEDED", finishedAt: new Date("2026-07-02T12:00:00") };
  let jobs: any[] = [];
  let dbOffline = false;

  try {
    const [
      sCount,
      aCount,
      rCount,
      cCount,
      iCount,
      prCount,
      plts,
      dateRange,
      pipelineRun,
      jbs
    ] = await Promise.all([
      prisma.sourceRecord.count(),
      prisma.sourceRecord.count({ where: { relevanceStatus: "ACCEPTED" } }),
      prisma.robotModel.count(),
      prisma.contribution.count(),
      prisma.ownedInventory.count(),
      prisma.submittedData.count({ where: { status: { in: ["QUEUED", "NEEDS_REVIEW"] } } }),
      prisma.sourceRecord.groupBy({ by: ["platform"], _count: { _all: true } }),
      prisma.sourceRecord.aggregate({ _min: { publishedAt: true }, _max: { publishedAt: true } }),
      prisma.pipelineRun.findFirst({ orderBy: { startedAt: "desc" } }),
      prisma.sourcePullJob.findMany({ orderBy: { createdAt: "desc" }, take: 5 })
    ]);

    sourcesCount = sCount;
    acceptedCount = aCount;
    robotsCount = rCount;
    contributionsCount = cCount;
    inventoryCount = iCount;
    pendingReviewsCount = prCount;
    platforms = plts;
    latestPipelineRun = pipelineRun;
    jobs = jbs;

    const minYear = dateRange._min.publishedAt ? dateRange._min.publishedAt.getFullYear() : "N/A";
    const maxYear = dateRange._max.publishedAt ? dateRange._max.publishedAt.getFullYear() : "N/A";
    yearRangeStr = minYear !== "N/A" || maxYear !== "N/A" ? `${minYear} – ${maxYear}` : "No date data";
  } catch (error) {
    console.error("Database connection failed, falling back to simulated research data:", error);
    dbOffline = true;
    
    // Fallback jobs list when DB is offline
    jobs = [
      { id: "1", adapter: "Facebook", query: "Thailand humanoid", status: "SUCCEEDED", recordsFound: 5, recordsSaved: 5, finishedAt: new Date() },
      { id: "2", adapter: "RSS", query: "robotics.mi.th", status: "SUCCEEDED", recordsFound: 12, recordsSaved: 10, finishedAt: new Date() }
    ];
  }

  // Format date for Pipeline status card
  let lastUpdatedStr = "Last: N/A";
  if (latestPipelineRun?.finishedAt) {
    const finishedDate = new Date(latestPipelineRun.finishedAt);
    lastUpdatedStr = `Last: ${finishedDate.getMonth() + 1}/${finishedDate.getDate()}/${finishedDate.getFullYear()}`;
  }

  return (
    <div className="console-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .console-wrapper {
          position: relative;
          min-height: calc(100vh - 36px);
          background: #eae9df; /* Warm cream background */
          background-image: radial-gradient(#cbd5e1 1.5px, transparent 1.5px);
          background-size: 24px 24px;
          padding: 30px 40px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: var(--font-inter), var(--font-noto-sans-thai), sans-serif;
        }

        /* Ambient glowing circles surrounding the robot */
        .ambient-glow {
          position: absolute;
          top: 15%;
          right: -8%;
          width: 580px;
          height: 580px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, rgba(234, 179, 8, 0.04) 50%, transparent 80%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
        }

        /* 3D Immersive Robot Stage */
        .immersive-stage {
          position: absolute;
          top: 6%;
          right: -40px;
          width: 48%;
          height: 88%;
          pointer-events: none;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .model-container {
          width: 100%;
          height: 100%;
          position: relative;
          pointer-events: auto;
        }

        /* Orbit rings with golden glow and gradient */
        .orbit-ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }

        .ring-1 {
          width: 440px;
          height: 440px;
          border: 1.5px dashed rgba(234, 179, 8, 0.35);
          box-shadow: 0 0 15px rgba(234, 179, 8, 0.2);
          transform: rotateX(70deg) rotateY(12deg);
          animation: spinRing 24s linear infinite;
        }

        .ring-2 {
          width: 500px;
          height: 500px;
          border: 1px solid rgba(16, 185, 129, 0.2);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
          transform: rotateX(75deg) rotateY(-18deg);
          animation: spinRingInverse 30s linear infinite;
        }

        /* Metrics Strip styling */
        .metrics-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #08130f; /* Very deep dark green */
          border: 1px solid #11261f;
          border-radius: 14px;
          padding: 20px 24px;
          margin-bottom: 16px;
          box-shadow: 0 12px 35px rgba(5, 13, 10, 0.3);
          position: relative;
          z-index: 3;
          max-width: 680px;
        }

        .metric-block {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 10px;
        }

        .metric-block:not(:last-child) {
          border-right: 1px solid rgba(20, 53, 42, 0.45);
        }

        .metric-icon-badge {
          width: 46px;
          height: 46px;
          border-radius: 10px;
          background: rgba(20, 53, 42, 0.6);
          border: 1px solid rgba(16, 185, 129, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10B981; /* Emerald green */
        }

        .metric-info {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #78998c;
          font-weight: 500;
        }

        .metric-val {
          font-size: 26px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          margin-top: 2px;
        }

        .metric-sub {
          font-size: 10.5px;
          font-weight: 500;
          color: #a3c2b5;
          margin-top: 2px;
        }

        .metric-sub.green-highlight {
          color: #10B981;
        }

        /* Secondary Row */
        .status-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
          position: relative;
          z-index: 3;
          max-width: 680px;
        }

        .status-card {
          background: #08130f;
          border: 1px solid #11261f;
          border-radius: 14px;
          padding: 20px 24px;
          box-shadow: 0 8px 24px rgba(5, 13, 10, 0.25);
          display: flex;
          flex-direction: column;
          min-height: 120px;
          position: relative;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #78998c;
          margin-bottom: 14px;
        }

        .status-icon-top {
          position: absolute;
          top: 20px;
          right: 24px;
          color: #78998c;
          opacity: 0.6;
        }

        .status-val {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
        }

        .status-badge-pill {
          display: inline-block;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10B981;
          font-weight: 700;
          font-size: 12px;
          padding: 5px 12px;
          border-radius: 20px;
          letter-spacing: 0.5px;
        }

        /* Platform Panel */
        .platform-panel {
          background: #08130f;
          border: 1px solid #11261f;
          border-radius: 14px;
          padding: 20px 24px;
          box-shadow: 0 8px 24px rgba(5, 13, 10, 0.25);
          margin-bottom: 16px;
          position: relative;
          z-index: 3;
          max-width: 680px;
        }

        .platform-grid {
          display: flex;
          gap: 16px;
          margin-top: 16px;
        }

        .platform-block {
          flex: 1;
          background: rgba(20, 53, 42, 0.35);
          border: 1px solid rgba(20, 53, 42, 0.6);
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .platform-block:hover {
          border-color: rgba(16, 185, 129, 0.4);
          background: rgba(20, 53, 42, 0.5);
        }

        .platform-logo-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 16px;
        }

        .platform-logo-circle.facebook { background: #1877F2; }
        .platform-logo-circle.youtube { background: #FF0000; }
        .platform-logo-circle.website { background: #10B981; }

        .platform-info {
          display: flex;
          flex-direction: column;
        }

        /* Step cards Empty state */
        .step-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 14px;
        }

        .step-card {
          background: #ecebe4;
          border: 1px solid rgba(20, 53, 42, 0.1);
          border-radius: 10px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .step-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #14352a;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes spinRing {
          0% { transform: rotateX(70deg) rotateY(12deg) rotate(0deg); }
          100% { transform: rotateX(70deg) rotateY(12deg) rotate(360deg); }
        }

        @keyframes spinRingInverse {
          0% { transform: rotateX(75deg) rotateY(-18deg) rotate(360deg); }
          100% { transform: rotateX(75deg) rotateY(-18deg) rotate(0deg); }
        }

        @media (max-width: 1024px) {
          .immersive-stage {
            position: relative;
            width: 100%;
            height: 380px;
            top: 0;
            right: 0;
          }
          .console-wrapper {
            overflow-y: auto;
          }
          .metrics-strip {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .metric-block:nth-child(2) {
            border-right: none;
          }
        }
      `}} />

      {/* Atmospheric glow effect background */}
      <div className="ambient-glow" />

      {/* 3D Immersive Robot Stage */}
      <div className="immersive-stage">
        <div className="orbit-ring ring-1" />
        <div className="orbit-ring ring-2" />
        
        <div className="model-container">
          <RobotViewer />
        </div>
      </div>

      {/* Left/Middle Content Console */}
      <div style={{ width: "55%", position: "relative", zIndex: 3, display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Header Section */}
        <div className="topline" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
          <div>
            <h1 style={{ fontSize: "3.2rem", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-1px", lineHeight: "0.95", margin: 0, color: "#14352a" }}>
              OVERVIEW
            </h1>
            <h1 style={{ fontSize: "2.4rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "-1px", lineHeight: "1.0", margin: "4px 0 0 0", color: "#EAB308" }}>
              & CORPUS SUMMARY
            </h1>
            <p className="muted font-mono" style={{ margin: "12px 0 0 0", fontSize: "13px", color: "#56645c" }}>
              {t.overviewDesc}
            </p>
          </div>
          
          <div className="toolbar" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link className="button" href="/data-pulls" style={{ background: "#0b291d", color: "#ffffff", border: "1px solid #0b291d", fontWeight: "700", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "10px" }}>▶</span> {t.runDataPull}
            </Link>
            <Link className="button" href="/database" style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", boxShadow: "0 2px 4px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📂</span> {t.browseDatabase}
            </Link>
            <Link className="button" href="/submit-data" style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", boxShadow: "0 2px 4px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📨</span> {t.submitRecord}
            </Link>
            <Link className="button" href="/admin/submitted-data" style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", boxShadow: "0 2px 4px rgba(0,0,0,0.03)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📋</span> {t.reviewQueue} <span style={{ color: "#10B981", fontWeight: "800" }}>({pendingReviewsCount})</span>
            </Link>
          </div>
        </div>

        {/* Database Offline warning alert container */}
        {dbOffline && (
          <div className="notice" style={{
            backgroundColor: "#fffdf5",
            border: "1px solid #fef08a",
            borderLeft: "4px solid #EAB308",
            borderRadius: "8px",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 4px 12px rgba(234, 179, 8, 0.05)",
            margin: "0",
            maxWidth: "680px"
          }}>
            <span style={{ fontSize: "20px" }}>⚠️</span>
            <div style={{ fontSize: "13.5px", color: "#451a03", lineHeight: "1.4" }}>
              <strong>Database Offline:</strong> Live PostgreSQL is unavailable. Showing sample atlas records for layout preview.
            </div>
          </div>
        )}

        {/* Primary Metrics Strip */}
        <section className="metrics-strip">
          {/* Metric 1 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.totalSources}</span>
              <span className="metric-val">{sourcesCount}</span>
              <span className="metric-sub green-highlight">Accepted: {acceptedCount}</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.robotModels}</span>
              <span className="metric-val">{robotsCount}</span>
              <span className="metric-sub">Registered models</span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.ownedUnits}</span>
              <span className="metric-val">{inventoryCount}</span>
              <span className="metric-sub">Team inventory</span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.contributors}</span>
              <span className="metric-val">{contributionsCount}</span>
              <span className="metric-sub">Repos & papers</span>
            </div>
          </div>
        </section>

        {/* Secondary Status Row */}
        <div className="status-row">
          {/* Pipeline Status */}
          <div className="status-card">
            <div className="status-header">
              <span>{t.pipelineStatus}</span>
            </div>
            <div className="status-icon-top">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", marginTop: "4px" }}>
              {latestPipelineRun ? (
                <div className="status-badge-pill">
                  {latestPipelineRun.pipelineName}: {latestPipelineRun.status}
                </div>
              ) : (
                <div className="status-badge-pill" style={{ color: "#94a3b8", borderColor: "#475569" }}>
                  No active pipeline runs
                </div>
              )}
            </div>
            <div style={{ fontSize: "10.5px", color: "#78998c", marginTop: "10px" }}>
              {lastUpdatedStr}
            </div>
          </div>

          {/* Temporal Coverage */}
          <div className="status-card">
            <div className="status-header">
              <span>{t.temporalCoverage}</span>
            </div>
            <div className="status-icon-top">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div className="status-val" style={{ marginTop: "4px", fontSize: "28px", fontWeight: "800" }}>
              {yearRangeStr}
            </div>
            <div style={{ fontSize: "10.5px", color: "#78998c", marginTop: "10px" }}>
              {t.activeMediaPubs}
            </div>
          </div>
        </div>

        {/* Sources by Ingestion Platform */}
        <div className="platform-panel">
          <h3 style={{ margin: 0, fontSize: "11px", fontWeight: "800", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            {t.sourcesByPlatform}
          </h3>
          <div className="platform-grid">
            {platforms.map((p) => {
              const name = String(p.platform || "unknown").toLowerCase();
              let logoClass = "website";
              let initials = "W";
              let sparklineD = "M0 12 Q15 5 30 16 T60 6"; // Default Website Sparkline

              if (name.includes("facebook")) {
                logoClass = "facebook";
                initials = "f";
                sparklineD = "M0 18 Q15 5 30 14 T60 8";
              } else if (name.includes("youtube")) {
                logoClass = "youtube";
                initials = "Y";
                sparklineD = "M0 15 Q15 18 30 8 T60 12";
              }

              return (
                <div className="platform-block" key={p.platform || "unknown"}>
                  <div className={`platform-logo-circle ${logoClass}`}>
                    {initials}
                  </div>
                  <div className="platform-info">
                    <span className="muted" style={{ textTransform: "capitalize", fontSize: "10.5px", color: "#78998c", fontWeight: "600" }}>
                      {p.platform || "unknown"}
                    </span>
                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#ffffff", marginTop: "2px", lineHeight: "1" }}>
                      {p._count._all}
                    </div>
                  </div>
                  
                  {/* Decorative sparkline chart */}
                  <svg width="60" height="20" viewBox="0 0 60 20" style={{ marginLeft: "auto", alignSelf: "center" }}>
                    <path d={sparklineD} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              );
            })}
          </div>
        </div>

        {/* Database Empty State Guide */}
        {robotsCount === 0 && (
          <div className="panel" style={{
            background: "#ecebe4",
            border: "1px solid rgba(20, 53, 42, 0.15)",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.03)",
            borderRadius: "14px",
            padding: "20px 24px",
            marginTop: "10px",
            maxWidth: "680px"
          }}>
            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#14352a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t.emptyStateTitle}
            </h3>
            <p className="muted" style={{ fontSize: "12px", margin: "6px 0 14px 0", color: "#4b534f", lineHeight: "1.4" }}>
              If there are no robot models or source signals populated, run the following CLI commands in the root of the project to initialize:
            </p>
            <div className="step-grid">
              <div className="step-card">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="step-badge">1</div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#14352a" }}>Initialize DB tables</span>
                </div>
                <code style={{ fontSize: "10.5px", background: "#0b130f", padding: "8px 10px", borderRadius: "6px", color: "#ffffff", fontFamily: "monospace", display: "block", marginTop: "4px" }}>
                  python -m humanoid_atlas db init
                </code>
              </div>
              <div className="step-card">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="step-badge">2</div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#14352a" }}>Seed robot models</span>
                </div>
                <code style={{ fontSize: "10.5px", background: "#0b130f", padding: "8px 10px", borderRadius: "6px", color: "#ffffff", fontFamily: "monospace", display: "block", marginTop: "4px", overflowX: "auto" }}>
                  python -m humanoid_atlas ingest seeds --file data/seeds/robot_models.seed.yml
                </code>
              </div>
              <div className="step-card">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div className="step-badge">3</div>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#14352a" }}>Seed inventory and relations</span>
                </div>
                <code style={{ fontSize: "10.5px", background: "#0b130f", padding: "8px 10px", borderRadius: "6px", color: "#ffffff", fontFamily: "monospace", display: "block", marginTop: "4px", overflowX: "auto" }}>
                  python -m humanoid_atlas ingest seeds --file data/seeds/inventory.seed.yml
                </code>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
