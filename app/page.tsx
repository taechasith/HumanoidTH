import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RobotViewer from "./components/RobotViewer";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let statsCount = {
    sourcesCount: 0,
    acceptedCount: 0,
    robotsCount: 0,
    contributionsCount: 0,
    inventoryCount: 0,
    perspectivesCount: 0,
    pendingReviewsCount: 0,
    platforms: [] as any[],
    yearRangeStr: "N/A",
    latestPipelineRun: null as any,
    jobs: [] as any[]
  };
  let dbOffline = false;

  try {
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

    statsCount = {
      sourcesCount,
      acceptedCount,
      robotsCount,
      contributionsCount,
      inventoryCount,
      perspectivesCount,
      pendingReviewsCount,
      platforms,
      yearRangeStr,
      latestPipelineRun,
      jobs
    };
  } catch (error) {
    console.error("Prisma query failed in home page (OverviewPage):", error);
    dbOffline = true;
    // Serve representative sample data when the live database is unavailable.
    statsCount = {
      sourcesCount: 154,
      acceptedCount: 132,
      robotsCount: 3,
      contributionsCount: 8,
      inventoryCount: 2,
      perspectivesCount: 12,
      pendingReviewsCount: 1,
      platforms: [
        { platform: "facebook", _count: { _all: 84 } },
        { platform: "youtube", _count: { _all: 41 } },
        { platform: "website", _count: { _all: 29 } }
      ],
      yearRangeStr: "2020 – 2026",
      latestPipelineRun: { pipelineName: "RSS Ingestion", status: "SUCCEEDED", finishedAt: new Date() },
      jobs: [
        { id: "1", adapter: "facebook", query: "Thailand humanoid", status: "SUCCEEDED", recordsFound: 5, recordsSaved: 5, finishedAt: new Date() },
        { id: "2", adapter: "rss", query: "robotics.mi.th", status: "SUCCEEDED", recordsFound: 12, recordsSaved: 10, finishedAt: new Date() }
      ]
    };
  }

  return (
    <>
      <div className="topline">
        <div>
          <h1>Overview & Corpus Summary</h1>
          <p className="muted font-mono">
            Research database for Thailand humanoid, social, and service robotics records.
          </p>
        </div>
        <div className="toolbar">
          <Link className="button primary" href="/data-pulls">Run data pull</Link>
          <Link className="button" href="/database">Browse database</Link>
          <Link className="button" href="/submit-data">Submit record</Link>
          <Link className="button" href="/admin/submitted-data">Review Queue ({statsCount.pendingReviewsCount})</Link>
        </div>
      </div>

      {dbOffline && (
        <div className="notice" style={{ backgroundColor: "#fffbeb", borderLeftColor: "var(--warning)", marginBottom: "16px" }}>
          <strong>Database Offline:</strong> Live PostgreSQL is unavailable. Showing sample atlas records so the page structure remains visible.
        </div>
      )}

      {/* Main Column Layout */}
      <div className="two" style={{ gridTemplateColumns: "1fr 400px", gap: "20px" }}>
        
        {/* Left Side: Stats and Platforms breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Overview Stat Widgets Grid */}
          <section className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>Total Sources</div>
              <div className="stat" style={{ fontSize: "22px" }}>{statsCount.sourcesCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Accepted: {statsCount.acceptedCount}
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>Robot Models</div>
              <div className="stat" style={{ fontSize: "22px" }}>{statsCount.robotsCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Registered models
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>Owned Units</div>
              <div className="stat" style={{ fontSize: "22px" }}>{statsCount.inventoryCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Team inventory
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>Contributions</div>
              <div className="stat" style={{ fontSize: "22px" }}>{statsCount.contributionsCount}</div>
              <div className="muted" style={{ fontSize: "11px", marginTop: "4px" }}>
                Repos & papers
              </div>
            </div>
          </section>

          {/* Pipeline & Coverage widgets */}
          <section className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>Pipeline Status</div>
              <div className="stat" style={{ fontSize: "15px", fontWeight: "bold", padding: "6px 0" }}>
                {statsCount.latestPipelineRun ? (
                  <span className={`badge ${statsCount.latestPipelineRun.status === "SUCCEEDED" ? "ok" : statsCount.latestPipelineRun.status === "FAILED" ? "danger" : "warn"}`}>
                    {statsCount.latestPipelineRun.pipelineName}: {statsCount.latestPipelineRun.status}
                  </span>
                ) : (
                  <span className="badge">No pipeline runs</span>
                )}
              </div>
              <div className="muted" style={{ fontSize: "11px" }}>
                Last: {statsCount.latestPipelineRun?.finishedAt?.toLocaleDateString() ?? "N/A"}
              </div>
            </div>
            <div className="panel">
              <div className="muted" style={{ fontSize: "12px" }}>Temporal Coverage</div>
              <div className="stat" style={{ fontSize: "18px", padding: "4px 0" }}>{statsCount.yearRangeStr}</div>
              <div className="muted" style={{ fontSize: "11px" }}>
                Source publication dates
              </div>
            </div>
          </section>

          {/* Sources by platform breakdown */}
          <div className="panel">
            <h2>Sources by Ingestion Platform</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px", marginTop: "10px" }}>
              {statsCount.platforms.map((p) => (
                <div className="card" key={p.platform || "unknown"} style={{ padding: "8px 12px" }}>
                  <span className="muted" style={{ textTransform: "capitalize", fontSize: "11px" }}>
                    {p.platform || "unknown"}
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>{p._count._all}</div>
                </div>
              ))}
              {!statsCount.platforms.length && <div className="empty">No platform records.</div>}
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
        <h2>Database Empty State Guide</h2>
        <p className="muted" style={{ fontSize: "13px" }}>
          If there are no robot models or source signals populated, initialize the active Next.js database with these project commands:
        </p>
        <pre style={{ background: "var(--surface-muted)", padding: "10px", borderRadius: "6px", fontSize: "12px", overflowX: "auto", marginTop: "10px" }}>
          <code>
{`# 1. Generate the Prisma client
pnpm db:generate

# 2. Apply the Prisma schema to the database
pnpm db:push

# 3. Seed sample atlas records
pnpm db:seed

# 4. Optional: pull live source records from the Data Pulls page`}
          </code>
        </pre>
      </div>

      <h2 style={{ marginTop: 22 }}>Recent Pull Jobs</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Adapter</th>
              <th>Query</th>
              <th>Status</th>
              <th>Records Found</th>
              <th>Records Saved</th>
              <th>Finished</th>
            </tr>
          </thead>
          <tbody>
            {statsCount.jobs.map((job) => (
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
            {!statsCount.jobs.length && <tr><td className="empty" colSpan={6}>No pull jobs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
