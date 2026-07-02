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

  let items: any[] = [];
  let robots: any[] = [];
  let uniqueOrgs: string[] = [];
  let dbOffline = false;

  try {
    const [dbItems, dbRobots, dbOrganizations] = await Promise.all([
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

    items = dbItems;
    robots = dbRobots;
    uniqueOrgs = dbOrganizations.map(o => o.organization).filter(Boolean) as string[];
  } catch (error) {
    console.error("Database connection failed in contributions page:", error);
    dbOffline = true;
    
    // Serve high-fidelity mock datasets for contributions
    robots = [
      { id: "1", canonicalName: "Dinsaw Mini" },
      { id: "2", canonicalName: "NAO" }
    ];
    uniqueOrgs = ["FIBO KMUTT", "Chulalongkorn University", "National Robotics Lab"];
    
    items = [
      {
        id: "mock-c-1",
        title: "Thai HRI research seed",
        contributorName: "Dr. Somchai",
        organization: "FIBO KMUTT",
        contributionType: "research_paper",
        license: "MIT",
        verificationStatus: "VERIFIED",
        description: "Kinematic evaluation of elderly companionship robots in nursing environments using NAO platform.",
        url: "https://github.com/fibo/hri-companion",
        updatedAt: new Date(),
        relatedRobotModel: { canonicalName: "NAO" }
      },
      {
        id: "mock-c-2",
        title: "Dinsaw navigation patches",
        contributorName: "Developer Team",
        organization: "CT Asia Robotics",
        contributionType: "software_repository",
        license: "MIT",
        verificationStatus: "VERIFIED",
        description: "SLAM mapping configuration patches for indoor corridor navigation for Dinsaw Mini models.",
        url: "https://github.com/ctasia/dinsaw-navigation",
        updatedAt: new Date(),
        relatedRobotModel: { canonicalName: "Dinsaw Mini" }
      }
    ];

    // Filter items locally if parameters were specified
    if (type) items = items.filter(i => i.contributionType === type);
    if (org) items = items.filter(i => i.organization === org);
    if (status) items = items.filter(i => i.verificationStatus === status);
    if (q) {
      const qLower = q.toLowerCase();
      items = items.filter(i => 
        i.title.toLowerCase().includes(qLower) || 
        i.contributorName.toLowerCase().includes(qLower) ||
        i.description.toLowerCase().includes(qLower)
      );
    }
  }

  // Taxonomies
  const contributionTypes = [
    "research_paper",
    "software_repository",
    "hardware_design",
    "dataset",
    "educational_material",
    "event_demo_record"
  ];

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.contributorsTitle}</h1>
          <p className="muted">{t.contributorsDesc}</p>
        </div>
      </div>

      {dbOffline && (
        <div className="notice" style={{ backgroundColor: "#fffbeb", borderLeftColor: "var(--warning)", marginBottom: "16px" }}>
          <strong>⚠️ Database Offline:</strong> Live PostgreSQL connection is unavailable (normal for Vercel preview environments). Displaying high-fidelity simulated contribution records.
        </div>
      )}

      {/* Filter Toolbar */}
      <form method="GET" className="panel grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr)) 80px", gap: "10px", alignItems: "end", marginBottom: "16px" }}>
        <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          Type
          <select name="type" defaultValue={type || ""}>
            <option value="">All Types</option>
            {contributionTypes.map(ct => (
              <option key={ct} value={ct}>{ct.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          Organization
          <select name="org" defaultValue={org || ""}>
            <option value="">All Organizations</option>
            {uniqueOrgs.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          Target Robot
          <select name="robot" defaultValue={robot || ""}>
            <option value="">All Robots</option>
            {robots.map(r => (
              <option key={r.id} value={r.id}>{r.canonicalName}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          Verification Status
          <select name="status" defaultValue={status || ""}>
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="UNVERIFIED">Unverified</option>
            <option value="FLAGGED">Flagged</option>
          </select>
        </label>

        <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          Text Search
          <input name="q" defaultValue={q || ""} placeholder="e.g. SLAM, study" />
        </label>

        <button type="submit" className="primary" style={{ minHeight: "36px" }}>Apply</button>
      </form>

      {/* Contributions Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title / Contributor</th>
              <th>Type</th>
              <th>Organization</th>
              <th>Target Model</th>
              <th>License</th>
              <th>Status</th>
              <th>Abstract / Description</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.title}</strong>
                  <br />
                  <span className="muted" style={{ fontSize: "12px" }}>By {item.contributorName}</span>
                </td>
                <td>
                  <span className="badge" style={{ textTransform: "capitalize" }}>
                    {item.contributionType.replace(/_/g, " ")}
                  </span>
                </td>
                <td>{item.organization || "N/A"}</td>
                <td>{item.relatedRobotModel?.canonicalName || "General / None"}</td>
                <td><code>{item.license || "N/A"}</code></td>
                <td>
                  <span className={`badge ${item.verificationStatus === "VERIFIED" ? "ok" : item.verificationStatus === "FLAGGED" ? "danger" : "warn"}`}>
                    {item.verificationStatus}
                  </span>
                </td>
                <td style={{ maxWidth: "300px", fontSize: "12px" }}>
                  <div>{item.description || "No description."}</div>
                  {item.url && (
                    <div style={{ marginTop: "4px" }}>
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all" }}>
                        {item.url}
                      </a>
                    </div>
                  )}
                </td>
                <td style={{ fontSize: "12px" }}>
                  {item.updatedAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="empty" colSpan={8}>No contribution records match the current filter criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
