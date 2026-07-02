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

  let sourcesCount = 0;
  let acceptedCount = 0;
  let robotsCount = 0;
  let contributionsCount = 0;
  let inventoryCount = 0;
  let perspectivesCount = 0;
  let pendingReviewsCount = 0;
  let platforms: any[] = [];
  let minYear: string | number = "N/A";
  let maxYear: string | number = "N/A";
  let yearRangeStr = "No date data";
  let latestPipelineRun: any = null;
  let jobs: any[] = [];
  let dbOffline = false;

  try {
    const [
      sCount,
      aCount,
      rCount,
      cCount,
      iCount,
      pCount,
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
      prisma.perspectiveAnnotation.count(),
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
    perspectivesCount = pCount;
    pendingReviewsCount = prCount;
    platforms = plts;
    latestPipelineRun = pipelineRun;
    jobs = jbs;

    minYear = dateRange._min.publishedAt ? dateRange._min.publishedAt.getFullYear() : "N/A";
    maxYear = dateRange._max.publishedAt ? dateRange._max.publishedAt.getFullYear() : "N/A";
    yearRangeStr = minYear !== "N/A" || maxYear !== "N/A" ? `${minYear} – ${maxYear}` : "No date data";
  } catch (error) {
    console.error("Database connection failed in overview page:", error);
    dbOffline = true;
  }

  return (
    <div className="console-wrapper">
      <style dangerouslySetInnerHTML={{ __html: `
        .console-wrapper {
          position: relative;
          min-height: calc(100vh - 36px);
          background: radial-gradient(circle at 80% 25%, rgba(16, 185, 129, 0.09) 0%, transparent 60%),
                      radial-gradient(circle at 90% 75%, rgba(234, 179, 8, 0.05) 0%, transparent 50%),
                      #FAF9F5;
          background-image: radial-gradient(rgba(20, 53, 42, 0.04) 1px, transparent 1px);
          background-size: 24px 24px;
          padding: 24px 30px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: var(--font-inter), var(--font-noto-sans-thai), sans-serif;
        }

        /* 3D Immersive Robot Stage */
        .immersive-stage {
          position: absolute;
          top: 60px;
          right: -20px;
          width: 46%;
          height: 80%;
          pointer-events: none;
          z-index: 1;
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

        .robot-platform {
          position: absolute;
          bottom: 8%;
          left: 50%;
          transform: translateX(-50%) rotateX(75deg);
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(16, 185, 129, 0.4) 0%, rgba(11, 26, 21, 0.9) 70%, transparent 100%);
          border: 2px solid rgba(234, 179, 8, 0.35);
          box-shadow: 0 0 35px rgba(16, 185, 129, 0.5), inset 0 0 25px rgba(234, 179, 8, 0.4);
          animation: platformGlow 4s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .orbit-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px dashed rgba(16, 185, 129, 0.25);
          pointer-events: none;
        }

        .ring-1 {
          width: 420px;
          height: 420px;
          top: 20%;
          left: 5%;
          transform: rotateX(65deg) rotateY(15deg);
          animation: spinRing 22s linear infinite;
        }

        .ring-2 {
          width: 480px;
          height: 480px;
          top: 15%;
          left: -2%;
          border: 1px solid rgba(234, 179, 8, 0.12);
          transform: rotateX(72deg) rotateY(-18deg);
          animation: spinRingInverse 28s linear infinite;
        }

        /* Metrics Strip */
        .metrics-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: rgba(11, 26, 21, 0.94);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(20, 53, 42, 0.5);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
          box-shadow: 0 10px 30px rgba(5, 13, 10, 0.25);
          position: relative;
          z-index: 2;
        }

        .metric-block {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 16px;
        }

        .metric-block:not(:last-child) {
          border-right: 1px solid rgba(20, 53, 42, 0.4);
        }

        .metric-icon-badge {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(20, 53, 42, 0.65);
          border: 1px solid rgba(16, 185, 129, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #EAB308;
        }

        .metric-info {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a3c2b5;
        }

        .metric-val {
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          margin-top: 2px;
        }

        /* Secondary Row */
        .status-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }

        .status-card {
          background: rgba(11, 26, 21, 0.94);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(20, 53, 42, 0.5);
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 8px 24px rgba(5, 13, 10, 0.2);
          display: flex;
          flex-direction: column;
          min-height: 110px;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a3c2b5;
          margin-bottom: 12px;
        }

        .status-val {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
        }

        /* Platform Panel */
        .platform-panel {
          background: rgba(11, 26, 21, 0.94);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(20, 53, 42, 0.5);
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 8px 24px rgba(5, 13, 10, 0.2);
          margin-bottom: 20px;
          position: relative;
          z-index: 2;
        }

        .platform-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(115px, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .platform-block {
          background: rgba(20, 53, 42, 0.45);
          border: 1px solid rgba(20, 53, 42, 0.6);
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
        }

        .platform-block:hover {
          border-color: rgba(16, 185, 129, 0.45);
          background: rgba(20, 53, 42, 0.65);
        }

        /* Step cards Empty state */
        .step-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 12px;
        }

        .step-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .step-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #14352a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @keyframes platformGlow {
          0% {
            box-shadow: 0 0 25px rgba(16, 185, 129, 0.35), inset 0 0 15px rgba(234, 179, 8, 0.25);
          }
          100% {
            box-shadow: 0 0 50px rgba(16, 185, 129, 0.65), inset 0 0 35px rgba(234, 179, 8, 0.55);
          }
        }

        @keyframes spinRing {
          0% { transform: rotateX(65deg) rotateY(15deg) rotate(0deg); }
          100% { transform: rotateX(65deg) rotateY(15deg) rotate(360deg); }
        }

        @keyframes spinRingInverse {
          0% { transform: rotateX(72deg) rotateY(-18deg) rotate(360deg); }
          100% { transform: rotateX(72deg) rotateY(-18deg) rotate(0deg); }
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

      {/* 3D Immersive Robot Stage (Right column) */}
      <div className="immersive-stage">
        <div className="robot-platform" />
        <div className="orbit-ring ring-1" />
        <div className="orbit-ring ring-2" />
        
        {/* Particle/dot grid backdrop */}
        <div style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.14, pointerEvents: "none" }}>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="dotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#10B981" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotGrid)" />
          </svg>
        </div>

        <div className="model-container">
          <RobotViewer />
        </div>
      </div>

      {/* Left/Middle Content Stage */}
      <div style={{ width: "55%", position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Header Title & Actions Row */}
        <div className="topline" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "20px" }}>
          <div>
            <h1 style={{ fontSize: "2.6rem", fontWeight: "900", textTransform: "uppercase", letterSpacing: "-1px", lineHeight: "1.0", margin: 0, color: "#14352a" }}>
              OVERVIEW <span style={{ color: "#EAB308" }}>& CORPUS SUMMARY</span>
            </h1>
            <p className="muted font-mono" style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#56645c" }}>
              {t.overviewDesc}
            </p>
          </div>
          
          <div className="toolbar" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Link className="button" href="/data-pulls" style={{ background: "#14352a", color: "#ffffff", border: "1px solid #14352a", fontWeight: "700" }}>
              {t.runDataPull}
            </Link>
            <Link className="button" href="/database" style={{ background: "rgba(255, 255, 255, 0.7)", border: "1px solid #cbd5e1", color: "#334155", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
              {t.browseDatabase}
            </Link>
            <Link className="button" href="/submit-data" style={{ background: "rgba(255, 255, 255, 0.7)", border: "1px solid #cbd5e1", color: "#334155", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
              {t.submitRecord}
            </Link>
            <Link className="button" href="/admin/submitted-data" style={{ background: "rgba(255, 255, 255, 0.7)", border: "1px solid #cbd5e1", color: "#334155", boxShadow: "0 2px 4px rgba(0,0,0,0.03)" }}>
              {t.reviewQueue} ({pendingReviewsCount})
            </Link>
          </div>
        </div>

        {/* Database Offline Warning Box */}
        {dbOffline && (
          <div className="notice" style={{
            backgroundColor: "#fffdf5",
            border: "1px solid #fef08a",
            borderLeft: "4px solid #EAB308",
            borderRadius: "8px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 4px 12px rgba(234, 179, 8, 0.05)",
            margin: "0",
            maxWidth: "640px"
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div style={{ fontSize: "13px", color: "#451a03", lineHeight: "1.4" }}>
              <strong>Database Offline:</strong> Live PostgreSQL connection failed. Serving cached datasets.
            </div>
          </div>
        )}

        {/* A. Primary Metrics Strip */}
        <section className="metrics-strip">
          {/* Block 1 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4c0-.5.2-1 .6-1.4C5 2.2 5.5 2 6 2h12c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v18c0 .5-.2 1-.6 1.4-.4.4-.9.6-1.4.6H6c-.5 0-1-.2-1.4-.6C4.2 23 4 22.5 4 22z"/><path d="M12 18h.01"/><path d="M8 6h8"/><path d="M8 10h8"/><path d="M8 14h8"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.totalSources}</span>
              <span className="metric-val">{sourcesCount}</span>
              <span className="metric-sub">Accepted: {acceptedCount}</span>
            </div>
          </div>

          {/* Block 2 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.robotModels}</span>
              <span className="metric-val">{robotsCount}</span>
              <span className="metric-sub">Registered</span>
            </div>
          </div>

          {/* Block 3 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5Z"/><path d="M12 21v-9"/><path d="M21 8.5 12 13.5 3 8.5"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.ownedUnits}</span>
              <span className="metric-val">{inventoryCount}</span>
              <span className="metric-sub">Team Inventory</span>
            </div>
          </div>

          {/* Block 4 */}
          <div className="metric-block">
            <div className="metric-icon-badge">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div className="metric-info">
              <span className="metric-label">{t.contributors}</span>
              <span className="metric-val">{contributionsCount}</span>
              <span className="metric-sub">Repos & Papers</span>
            </div>
          </div>
        </section>

        {/* B. Secondary Status Row */}
        <div className="status-row">
          {/* Pipeline Card */}
          <div className="status-card">
            <div className="status-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg>
              <span>{t.pipelineStatus}</span>
            </div>
            <div className="status-val" style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
              {latestPipelineRun ? (
                <span className={`badge ${latestPipelineRun.status === "SUCCEEDED" ? "ok" : latestPipelineRun.status === "FAILED" ? "danger" : "warn"}`} style={{ fontSize: "12px", padding: "4px 8px" }}>
                  {latestPipelineRun.pipelineName}: {latestPipelineRun.status}
                </span>
              ) : (
                <span className="badge" style={{ fontSize: "12px" }}>No runs loaded</span>
              )}
            </div>
            <div style={{ fontSize: "10px", color: "#78998c", marginTop: "auto" }}>
              Last updated: {latestPipelineRun?.finishedAt?.toLocaleString() ?? "N/A"}
            </div>
          </div>

          {/* Temporal Coverage Card */}
          <div className="status-card">
            <div className="status-header">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>{t.temporalCoverage}</span>
            </div>
            <div className="status-val" style={{ margin: "4px 0", color: "#EAB308", fontSize: "20px", fontWeight: "800" }}>
              {yearRangeStr}
            </div>
            <div style={{ fontSize: "10px", color: "#78998c", marginTop: "auto" }}>
              {t.activeMediaPubs}
            </div>
          </div>
        </div>

        {/* C. Sources by Ingestion Platform */}
        <div className="platform-panel">
          <h3 style={{ margin: 0, fontSize: "12px", fontWeight: "800", color: "#ffffff", display: "flex", alignItems: "center", gap: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            {t.sourcesByPlatform}
          </h3>
          <div className="platform-grid">
            {platforms.map((p) => {
              const name = String(p.platform || "unknown").toLowerCase();
              let iconSymbol = "🌐";
              if (name.includes("facebook")) iconSymbol = "👥";
              if (name.includes("youtube")) iconSymbol = "🎥";
              if (name.includes("github")) iconSymbol = "💻";
              if (name.includes("gdelt")) iconSymbol = "📰";
              if (name.includes("openalex")) iconSymbol = "🎓";

              return (
                <div className="platform-block" key={p.platform || "unknown"}>
                  <span className="muted" style={{ textTransform: "capitalize", fontSize: "10px", color: "#a3c2b5", display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>{iconSymbol}</span>
                    <span>{p.platform || "unknown"}</span>
                  </span>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>{p._count._all}</div>
                </div>
              );
            })}
            {!platforms.length && <div className="empty" style={{ gridColumn: "1 / -1", color: "#78998c" }}>{t.noPlatformRecords}</div>}
          </div>
        </div>

        {/* D. Database Empty State Guide */}
        {robotsCount === 0 && (
          <div className="panel" style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(4px)",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.02)",
            borderRadius: "12px",
            padding: "16px 20px",
            marginTop: "10px"
          }}>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#14352a" }}>{t.emptyStateTitle}</h3>
            <p className="muted" style={{ fontSize: "12px", margin: "6px 0 12px 0", color: "#475569" }}>
              {t.emptyStateDesc}
            </p>
            <div className="step-grid">
              <div className="step-card">
                <div className="step-badge">1</div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e293b" }}>Sync Tables</span>
                <code style={{ fontSize: "10px", background: "#f1f5f9", padding: "4px 6px", borderRadius: "4px", color: "#0f172a" }}>pnpm db:push</code>
              </div>
              <div className="step-card">
                <div className="step-badge">2</div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e293b" }}>Populate Seeds</span>
                <code style={{ fontSize: "10px", background: "#f1f5f9", padding: "4px 6px", borderRadius: "4px", color: "#0f172a" }}>pnpm db:seed</code>
              </div>
              <div className="step-card">
                <div className="step-badge">3</div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e293b" }}>Run Pull Job</span>
                <span style={{ fontSize: "10px", color: "#64748b" }}>Go to Data Pulls tab</span>
              </div>
            </div>
          </div>
        )}

        {/* E. Recent Pull Jobs table */}
        <h3 style={{ margin: "14px 0 8px 0", fontSize: "14px", fontWeight: "800", color: "#14352a" }}>{t.recentPullJobs}</h3>
        <div className="table-wrap" style={{
          background: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(6px)",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0", background: "rgba(20, 53, 42, 0.03)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#475569" }}>{t.adapter}</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#475569" }}>{t.query}</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", color: "#475569" }}>{t.status}</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "11px", color: "#475569" }}>{t.recordsFound}</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "11px", color: "#475569" }}>{t.recordsSaved}</th>
                <th style={{ padding: "8px 12px", textAlign: "right", fontSize: "11px", color: "#475569" }}>{t.finished}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "8px 12px", fontSize: "12px", color: "#0f172a" }}><strong>{job.adapter}</strong></td>
                  <td style={{ padding: "8px 12px", fontSize: "12px", color: "#475569" }}><code>{job.query}</code></td>
                  <td style={{ padding: "8px 12px", fontSize: "12px" }}>
                    <span className={job.status === "SUCCEEDED" ? "badge ok" : job.status === "FAILED" ? "badge danger" : "badge warn"}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", fontSize: "12px", textAlign: "right", color: "#0f172a" }}>{job.recordsFound}</td>
                  <td style={{ padding: "8px 12px", fontSize: "12px", textAlign: "right", color: "#0f172a" }}>{job.recordsSaved}</td>
                  <td style={{ padding: "8px 12px", fontSize: "11px", textAlign: "right", color: "#64748b" }}>
                    {job.finishedAt ? new Date(job.finishedAt).toLocaleTimeString() : "Running"}
                  </td>
                </tr>
              ))}
              {!jobs.length && <tr><td className="empty" colSpan={6} style={{ textAlign: "center", color: "#94a3b8", padding: "16px" }}>{t.noPullJobs}</td></tr>}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
