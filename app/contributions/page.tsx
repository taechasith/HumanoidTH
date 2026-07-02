import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  type?: string;
  org?: string;
  robot?: string;
  status?: string;
  q?: string;
}>;

export default async function ContributionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { type, org, robot, status, q } = params;

  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  // Build filter conditions
  const where: any = {};
  if (type) where.contributionType = type;
  if (org) where.organization = org;
  if (robot) where.relatedRobotModelId = robot;
  if (status) where.verificationStatus = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { contributorName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } }
    ];
  }

  // Fetch data
  const [items, robots, organizations] = await Promise.all([
    prisma.contribution.findMany({
      where,
      include: { relatedRobotModel: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    }),
    prisma.robotModel.findMany({ select: { id: true, canonicalName: true } }),
    prisma.contribution.findMany({
      select: { organization: true },
      distinct: ["organization"],
      where: { organization: { not: null } }
    })
  ]);

  const uniqueOrgs = organizations.map(o => o.organization).filter(Boolean) as string[];

  // Taxonomies
  const contributionTypes = [
    "research_paper",
    "software_repository",
    "hardware_design",
    "dataset",
    "demo_or_exhibition",
    "workshop_or_course",
    "media_analysis",
    "field_observation",
    "translation_or_documentation",
    "repair_or_maintenance",
    "robot_deployment",
    "student_project",
    "policy_or_report",
    "other"
  ];

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.contributorsTitle}</h1>
          <p className="muted">
            {t.contributorsDesc}
          </p>
        </div>
      </div>


      {/* Filters Toolbar */}
      <form className="panel toolbar" method="GET" action="/contributions">
        <input 
          name="q" 
          defaultValue={q || ""} 
          placeholder="Search by title, creator, or desc..."
          style={{ flex: 1, minWidth: "200px" }}
        />

        <select name="type" defaultValue={type || ""}>
          <option value="">-- All Types --</option>
          {contributionTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>

        <select name="org" defaultValue={org || ""}>
          <option value="">-- All Organizations --</option>
          {uniqueOrgs.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>

        <select name="robot" defaultValue={robot || ""}>
          <option value="">-- All Robot Models --</option>
          {robots.map((r) => (
            <option key={r.id} value={r.id}>{r.canonicalName}</option>
          ))}
        </select>

        <select name="status" defaultValue={status || ""}>
          <option value="">-- All Review Statuses --</option>
          <option value="APPROVED">Approved</option>
          <option value="NEEDS_REVIEW">Needs Review</option>
          <option value="REJECTED">Rejected</option>
        </select>

        <button type="submit" className="primary">Apply Filters</button>
        {(q || type || org || robot || status) && (
          <a href="/contributions" className="button">Clear</a>
        )}
      </form>

      {/* Data Table */}
      <div className="table-wrap" style={{ marginTop: "14px" }}>
        <table>
          <thead>
            <tr>
              <th>Title & Evidence URL</th>
              <th>Category</th>
              <th>Contributor / Team</th>
              <th>Organization</th>
              <th>Target Robot Model</th>
              <th>License</th>
              <th>Verification Status</th>
              <th>Description / Abstract</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                  {item.sourceUrl && (
                    <div style={{ marginTop: "4px" }}>
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: "12px", wordBreak: "break-all" }}>
                        {item.sourceUrl}
                      </a>
                    </div>
                  )}
                </td>
                <td>
                  <span className="badge" style={{ textTransform: "capitalize" }}>
                    {item.contributionType.replace(/_/g, " ")}
                  </span>
                </td>
                <td>{item.contributorName || "Anonymous"}</td>
                <td>{item.organization || "N/A"}</td>
                <td>
                  {item.relatedRobotModel ? (
                    <span className="badge ok">{item.relatedRobotModel.canonicalName}</span>
                  ) : (
                    <span className="muted" style={{ fontSize: "12px" }}>None linked</span>
                  )}
                </td>
                <td>
                  <code style={{ fontSize: "12px" }}>{item.license || "unspecified"}</code>
                </td>
                <td>
                  <span className={`badge ${item.verificationStatus === "APPROVED" ? "ok" : item.verificationStatus === "REJECTED" ? "danger" : "warn"}`}>
                    {item.verificationStatus}
                  </span>
                </td>
                <td style={{ maxWidth: "300px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  {item.description || "No description provided."}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="empty" colSpan={8}>
                  No contributions found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
