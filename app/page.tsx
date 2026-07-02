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

  const [
    sourcesCount,
    acceptedCount,
    robotsCount,
    contributionsCount,
    inventoryCount,
    perspectivesCount,
    pendingReviewsCount,
    platforms,
    dateRange,
    latestPipelineRun,
    jobs
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

  const minYear = dateRange._min.publishedAt ? dateRange._min.publishedAt.getFullYear() : "N/A";
  const maxYear = dateRange._max.publishedAt ? dateRange._max.publishedAt.getFullYear() : "N/A";
  const yearRangeStr = minYear !== "N/A" || maxYear !== "N/A" ? `${minYear} – ${maxYear}` : "No date data";

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.overviewTitle}</h1>
          <p className="muted font-mono">{t.overviewDesc}</p>
        </div>
        <div className="toolbar">
          <Link className="button primary" href="/data-pulls">{t.runDataPull}</Link>
          <Link className="button" href="/database">{t.browseDatabase}</Link>
          <Link className="button" href="/submit-data">{t.submitRecord}</Link>
          <Link className="button" href="/admin/submitted-data">
            {t.reviewQueue} ({pendingReviewsCount})
          </Link>
        </div>
      </div>

      {/* Main Column Layout */}
      <div className="two" style={{ gridTemplateColumns: "1fr 400px", gap: "20px" }}>
        
        {/* Left Side: Stats and Platforms breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Overview Stat Widgets Grid */}
          <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>{t.totalSources}</div>
              <div className="stat" style={{ fontSize: "22px" }}>{sourcesCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Accepted: {acceptedCount}
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>{t.robotModels}</div>
              <div className="stat" style={{ fontSize: "22px" }}>{robotsCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Registered models
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>{t.ownedUnits}</div>
              <div className="stat" style={{ fontSize: "22px" }}>{inventoryCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Team inventory
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>{t.contributors}</div>
              <div className="stat" style={{ fontSize: "22px" }}>{contributionsCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Repos & papers
              </div>
            </div>
          </section>

          {/* Pipeline & Coverage widgets */}
          <section className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>{t.pipelineStatus}</div>
              <div className="stat" style={{ fontSize: "15px", fontWeight: "bold", padding: "6px 0" }}>
                {latestPipelineRun ? (
                  <span className={`badge ${latestPipelineRun.status === "SUCCEEDED" ? "ok" : latestPipelineRun.status === "FAILED" ? "danger" : "warn"}`}>
                    {latestPipelineRun.pipelineName}: {latestPipelineRun.status}
                  </span>
                ) : (
                  <span className="badge">No pipeline runs</span>
                )}
              </div>
              <div className="muted" style={{ fontSize: "11px" }}>
                Last: {latestPipelineRun?.finishedAt?.toLocaleDateString() ?? "N/A"}
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>{t.temporalCoverage}</div>
              <div className="stat" style={{ fontSize: "18px", padding: "4px 0" }}>{yearRangeStr}</div>
              <div className="muted" style={{ fontSize: "11px" }}>
                {t.activeMediaPubs}
              </div>
            </div>
          </section>

          {/* Sources by platform breakdown */}
          <div className="panel">
            <h2>{t.sourcesByPlatform}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px", marginTop: "10px" }}>
              {platforms.map((p) => (
                <div className="card" key={p.platform || "unknown"} style={{ padding: "8px 12px" }}>
                  <span className="muted" style={{ textTransform: "capitalize", fontSize: "11px" }}>
                    {p.platform || "unknown"}
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>{p._count._all}</div>
                </div>
              ))}
              {!platforms.length && <div className="empty">{t.noPlatformRecords}</div>}
            </div>
          </div>

        </div>

        {/* Right Side: Interactive 3D Model Viewer */}
        <aside style={{ display: "flex", flexDirection: "column" }}>
          <RobotViewer />
        </aside>

      </div>

      {/* Empty State Guide */}
      <div className="panel" style={{ marginTop: "20px" }}>
        <h2>{t.emptyStateTitle}</h2>
        <p className="muted" style={{ fontSize: "13px" }}>
          {t.emptyStateDesc}
        </p>
        <pre style={{ background: "var(--surface-muted)", padding: "10px", borderRadius: "6px", fontSize: "12px", overflowX: "auto", marginTop: "10px" }}>
          <code>
{`# 1. Initialize DB tables
python -m humanoid_atlas db init

# 2. Seed robot models
python -m humanoid_atlas ingest seeds --file data/seeds/robot_models.seed.yml

# 3. Seed inventory and relations
python -m humanoid_atlas ingest seeds --file data/seeds/owned_inventory.seed.yml

# 4. Extract graph relations
python -m humanoid_atlas analyze graph`}
          </code>
        </pre>
      </div>

      <h2 style={{ marginTop: 22 }}>{t.recentPullJobs}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.adapter}</th>
              <th>{t.query}</th>
              <th>{t.status}</th>
              <th>{t.recordsFound}</th>
              <th>{t.recordsSaved}</th>
              <th>{t.finished}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td><strong>{job.adapter}</strong></td>
                <td><code>{job.query}</code></td>
                <td>
                  <span className={job.status === "SUCCEEDED" ? "badge ok" : job.status === "FAILED" ? "badge danger" : "badge warn"}>
                    {job.status}
                  </span>
                </td>
                <td>{job.recordsFound}</td>
                <td>{job.recordsSaved}</td>
                <td>{job.finishedAt?.toLocaleString() ?? "Running"}</td>
              </tr>
            ))}
            {!jobs.length && <tr><td className="empty" colSpan={6}>{t.noPullJobs}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

