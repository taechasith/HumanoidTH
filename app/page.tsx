import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import RobotViewer from "./components/RobotViewer";
import CopyCommands from "./components/CopyCommands";
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
      pipelineRun
    ] = await Promise.all([
      prisma.sourceRecord.count(),
      prisma.sourceRecord.count({ where: { relevanceStatus: "ACCEPTED" } }),
      prisma.robotModel.count(),
      prisma.contribution.count(),
      prisma.ownedInventory.count(),
      prisma.submittedData.count({ where: { status: { in: ["QUEUED", "NEEDS_REVIEW"] } } }),
      prisma.sourceRecord.groupBy({ by: ["platform"], _count: { _all: true } }),
      prisma.sourceRecord.aggregate({ _min: { publishedAt: true }, _max: { publishedAt: true } }),
      prisma.pipelineRun.findFirst({ orderBy: { startedAt: "desc" } })
    ]);

    sourcesCount = sCount;
    acceptedCount = aCount;
    robotsCount = rCount;
    contributionsCount = cCount;
    inventoryCount = iCount;
    pendingReviewsCount = prCount;
    
    if (plts && plts.length > 0) {
      platforms = plts;
    }
    
    if (pipelineRun) {
      latestPipelineRun = pipelineRun;
    }

    const minYear = dateRange._min.publishedAt ? dateRange._min.publishedAt.getFullYear() : "N/A";
    const maxYear = dateRange._max.publishedAt ? dateRange._max.publishedAt.getFullYear() : "N/A";
    yearRangeStr = minYear !== "N/A" || maxYear !== "N/A" ? `${minYear} – ${maxYear}` : "No date data";
  } catch (error) {
    console.error("Database connection failed, falling back to simulated research data:", error);
    dbOffline = true;
  }

  // Format date for Pipeline status card
  let lastUpdatedStr = lang === "th" ? "ล่าสุด: ไม่มีข้อมูล" : "Last: N/A";
  if (latestPipelineRun?.finishedAt) {
    const finishedDate = new Date(latestPipelineRun.finishedAt);
    lastUpdatedStr = `${lang === "th" ? "ล่าสุด" : "Last"}: ${finishedDate.getMonth() + 1}/${finishedDate.getDate()}/${finishedDate.getFullYear()}`;
  }

  const cliCommands = [
    "python -m humanoid_atlas db init",
    "python -m humanoid_atlas ingest seeds --file data/seeds/robot_models.seed.yml",
    "python -m humanoid_atlas ingest seeds --file data/seeds/inventory.seed.yml"
  ];

  return (
    <main className="atlas-page">
      <style dangerouslySetInnerHTML={{ __html: `
        .atlas-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
          position: relative;
          z-index: 10;
          font-family: var(--font-inter), var(--font-noto-sans-thai), sans-serif;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 24px;
        }

        .topbar h1 {
          font-size: 2.8rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -1.5px;
          line-height: 0.95;
          margin: 8px 0;
          color: var(--accent);
        }

        .topbar h1 span {
          color: var(--warning);
          font-weight: 800;
          display: block;
          font-size: 2.2rem;
          margin-top: 4px;
        }

        .eyebrow {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--text-secondary);
          font-weight: 750;
          margin: 0;
        }

        .subtitle {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin: 8px 0 0 0;
          max-width: 600px;
          line-height: 1.5;
        }

        .topbar .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .topbar .actions .button {
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
          transition: all 0.2s ease;
        }

        .topbar .actions .button:hover {
          transform: translateY(-1px);
        }

        /* Hero grid layout */
        .hero-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          align-items: start;
        }

        .dashboard-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Alert styling */
        .alert {
          background: rgba(156, 46, 38, 0.08);
          border: 1px solid rgba(156, 46, 38, 0.2);
          border-left: 4px solid var(--danger);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 13px;
          color: #7f221c;
          line-height: 1.5;
        }

        /* Metrics grid */
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .metric-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 18px 20px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          transition: all 0.2s ease;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(25, 82, 60, 0.06);
          border-color: var(--accent);
        }

        .metric-icon {
          font-size: 20px;
          color: var(--accent);
          background: rgba(25, 82, 60, 0.05);
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .metric-card p {
          margin: 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .metric-card strong {
          display: block;
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin-top: 4px;
          line-height: 1.1;
        }

        .metric-card small {
          display: block;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        /* Status row: Glassmorphism cards */
        .status-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 12px;
          padding: 18px 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 120px;
        }

        .card-label {
          margin: 0 0 10px 0;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
          font-weight: 600;
        }

        .success-pill {
          background: rgba(40, 116, 75, 0.1);
          border: 1px solid rgba(40, 116, 75, 0.25);
          color: var(--success);
          font-size: 12px;
          font-weight: 700;
          padding: 6px 12px;
          border-radius: 20px;
          align-self: flex-start;
          letter-spacing: 0.2px;
        }

        .glass-card h3 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .glass-card small {
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 8px;
          display: block;
        }

        /* Platform Ingestion Card */
        .platform-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }

        .platform-card h3 {
          margin: 0 0 16px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-primary);
          font-weight: 800;
        }

        .platform-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .platform-item {
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
        }

        .platform-item span {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          color: white;
          flex-shrink: 0;
        }

        .platform-item.facebook span { background: #1877F2; }
        .platform-item.youtube span { background: #FF0000; }
        .platform-item.website span { background: #10B981; }

        .platform-item p {
          margin: 0;
          font-size: 10px;
          color: var(--text-secondary);
          text-transform: uppercase;
          font-weight: 600;
        }

        .platform-item strong {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .platform-item .sparkline {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--accent);
          opacity: 0.4;
        }

        /* Robot stage */
        .robot-stage {
          background: transparent;
          border: none;
          border-radius: 0;
          height: 700px;
          position: relative;
          overflow: visible;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 0;
          box-shadow: none;
        }

        .robot-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
        }

        .orbit {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          top: 50%;
          left: 50%;
          z-index: 1;
        }

        .orbit-one {
          width: 520px;
          height: 520px;
          border: 1.5px dashed rgba(234, 179, 8, 0.25);
          margin-top: -260px;
          margin-left: -260px;
          transform: rotateX(72deg) rotateY(15deg);
          animation: spinRing 20s linear infinite;
        }

        .orbit-two {
          width: 640px;
          height: 640px;
          border: 1px solid rgba(16, 185, 129, 0.15);
          margin-top: -320px;
          margin-left: -320px;
          transform: rotateX(75deg) rotateY(-15deg);
          animation: spinRingInverse 25s linear infinite;
        }

        .robot-model-wrapper {
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 2;
        }


        /* Terminal panel empty state */
        .terminal-panel {
          background: #08130f;
          border: 1px solid #11261f;
          border-radius: 12px;
          padding: 24px;
          color: #eef7f2;
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #14352a;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }

        .terminal-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 800;
          color: var(--warning);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .terminal-panel p {
          margin: 0 0 16px 0;
          font-size: 13px;
          color: #a3c2b5;
          line-height: 1.5;
        }

        .command-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .command-card {
          background: rgba(20, 53, 42, 0.3);
          border: 1px solid rgba(20, 53, 42, 0.6);
          border-radius: 8px;
          padding: 16px;
          position: relative;
          padding-top: 32px;
        }

        .command-card .step {
          position: absolute;
          top: 12px;
          left: 16px;
          background: var(--warning);
          color: #0b1a15;
          font-weight: 800;
          font-size: 10px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .command-card strong {
          display: block;
          font-size: 12.5px;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .command-card code {
          display: block;
          background: #040a08;
          padding: 8px 10px;
          border-radius: 4px;
          color: #10B981;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
          white-space: pre-wrap;
        }

        @keyframes spinRing {
          0% { transform: rotateX(72deg) rotateY(15deg) rotate(0deg); }
          100% { transform: rotateX(72deg) rotateY(15deg) rotate(360deg); }
        }

        @keyframes spinRingInverse {
          0% { transform: rotateX(75deg) rotateY(-15deg) rotate(360deg); }
          100% { transform: rotateX(75deg) rotateY(-15deg) rotate(0deg); }
        }

        @media (max-width: 860px) {
          .topbar h1 {
            font-size: 2.0rem;
          }
          .topbar h1 span {
            font-size: 1.6rem;
          }
          .hero-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .robot-stage {
            height: 380px;
            order: -1; /* Place interactive 3D robot model at the top on mobile */
          }
          .dashboard-stack {
            order: 2;
          }
          .metrics-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .status-row {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .platform-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .command-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .topbar {
            flex-direction: column;
            gap: 16px;
            padding-bottom: 20px;
          }
          .topbar .actions {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            width: 100%;
            gap: 8px;
          }
          .topbar .actions .button {
            justify-content: center;
            font-size: 12.5px;
            padding: 8px;
          }
        }

        @media (max-width: 480px) {
          .topbar h1 {
            font-size: 1.8rem;
          }
          .topbar h1 span {
            font-size: 1.4rem;
          }
          .robot-stage {
            height: 320px;
          }
          .metric-card {
            padding: 14px 16px;
          }
          .metric-card strong {
            font-size: 24px;
          }
        }
      `}} />

      {/* Header Section */}
      <header className="topbar">
        <div>
          <p className="eyebrow">{lang === "th" ? "คอนโซลวิจัยระบบ" : "Research Console"}</p>
          <h1>
            {lang === "th" ? "ภาพรวม" : "Overview"}{" "}
            <span>& {lang === "th" ? "สรุปคลังข้อมูล" : "Corpus Summary"}</span>
          </h1>
          <p className="subtitle">{t.overviewDesc}</p>
        </div>

        <div className="actions">
          <Link className="button primary" href="/data-pulls">
            <span style={{ fontSize: "10px" }}>▶</span> {t.runDataPull}
          </Link>
          <Link className="button" href="/database">
            <span>📂</span> {t.browseDatabase}
          </Link>
          <Link className="button" href="/submit-data">
            <span>📨</span> {t.submitRecord}
          </Link>
          <Link className="button" href="/admin/submitted-data">
            <span>📋</span> {t.reviewQueue}{" "}
            <span style={{ color: "var(--success)", fontWeight: "800" }}>
              ({pendingReviewsCount})
            </span>
          </Link>
        </div>
      </header>

      {/* Main Hero grid layout */}
      <div className="hero-grid">
        <section className="dashboard-stack">
          {/* Database Offline warning alert container */}
          {dbOffline && (
            <div className="alert">
              <strong>Database Offline:</strong> Live PostgreSQL is unavailable. Showing sample atlas records for layout preview.
            </div>
          )}

          {/* Primary Metrics Row */}
          <div className="metrics-row">
            {/* Metric 1 */}
            <article className="metric-card">
              <div className="metric-icon">◈</div>
              <div>
                <p>{t.totalSources}</p>
                <strong>{sourcesCount}</strong>
                <small>{lang === "th" ? `อนุมัติแล้ว: ${acceptedCount}` : `Accepted: ${acceptedCount}`}</small>
              </div>
            </article>

            {/* Metric 2 */}
            <article className="metric-card">
              <div className="metric-icon">◈</div>
              <div>
                <p>{t.robotModels}</p>
                <strong>{robotsCount}</strong>
                <small>{lang === "th" ? "รุ่นที่ลงทะเบียน" : "Registered models"}</small>
              </div>
            </article>

            {/* Metric 3 */}
            <article className="metric-card">
              <div className="metric-icon">◈</div>
              <div>
                <p>{t.ownedUnits}</p>
                <strong>{inventoryCount}</strong>
                <small>{lang === "th" ? "คลังอุปกรณ์ของทีม" : "Team inventory"}</small>
              </div>
            </article>

            {/* Metric 4 */}
            <article className="metric-card">
              <div className="metric-icon">◈</div>
              <div>
                <p>{t.contributors}</p>
                <strong>{contributionsCount}</strong>
                <small>{lang === "th" ? "คลังโค้ดและเอกสาร" : "Repos & papers"}</small>
              </div>
            </article>
          </div>

          {/* Secondary Status Row */}
          <div className="status-row">
            {/* Pipeline Status */}
            <div className="glass-card">
              <p className="card-label">{t.pipelineStatus}</p>
              {latestPipelineRun ? (
                <div className="success-pill">
                  {latestPipelineRun.pipelineName}: {latestPipelineRun.status}
                </div>
              ) : (
                <div className="success-pill" style={{ background: "rgba(100, 116, 139, 0.1)", color: "#94a3b8", borderColor: "#475569" }}>
                  No active runs
                </div>
              )}
              <small>{lastUpdatedStr}</small>
            </div>

            {/* Temporal Coverage */}
            <div className="glass-card">
              <p className="card-label">{t.temporalCoverage}</p>
              <h3>{yearRangeStr}</h3>
              <small>{t.activeMediaPubs}</small>
            </div>
          </div>

          {/* Sources by Ingestion Platform */}
          <div className="platform-card">
            <h3>{t.sourcesByPlatform}</h3>

            <div className="platform-grid">
              {platforms.map((p) => {
                const name = String(p.platform || "unknown").toLowerCase();
                let logoClass = "website";
                let initials = "W";

                if (name.includes("facebook")) {
                  logoClass = "facebook";
                  initials = "f";
                } else if (name.includes("youtube")) {
                  logoClass = "youtube";
                  initials = "▶";
                } else if (name.includes("website")) {
                  logoClass = "website";
                  initials = "◎";
                }

                return (
                  <div className={`platform-item ${logoClass}`} key={p.platform || "unknown"}>
                    <span>{initials}</span>
                    <div>
                      <p style={{ textTransform: "capitalize" }}>{p.platform || "unknown"}</p>
                      <strong>{p._count?._all ?? p._count ?? 0}</strong>
                    </div>
                    <div className="sparkline" />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3D Immersive Robot Embodiment View */}
        <section className="robot-stage">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="robot-glow" />

          <div className="robot-model-wrapper">
            <RobotViewer />
          </div>
        </section>
      </div>

      {/* Database Empty State Guide */}
      <section className="terminal-panel">
        <div className="terminal-header">
          <h3>{t.emptyStateTitle}</h3>
          <CopyCommands commands={cliCommands} />
        </div>

        <p>{t.emptyStateDesc}</p>

        <div className="command-grid">
          <div className="command-card">
            <div className="step">1</div>
            <strong>Initialize DB tables</strong>
            <code>python -m humanoid_atlas db init</code>
          </div>
          <div className="command-card">
            <div className="step">2</div>
            <strong>Seed robot models</strong>
            <code>python -m humanoid_atlas ingest seeds --file data/seeds/robot_models.seed.yml</code>
          </div>
          <div className="command-card">
            <div className="step">3</div>
            <strong>Seed inventory and relations</strong>
            <code>python -m humanoid_atlas ingest seeds --file data/seeds/inventory.seed.yml</code>
          </div>
        </div>
      </section>
    </main>
  );
}
