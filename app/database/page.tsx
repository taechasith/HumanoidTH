import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ table?: string; q?: string }>;

const tableOptions = [
  { value: "sources", label: "Source Records" },
  { value: "robots", label: "Robot Models" },
  { value: "owned_inventory", label: "Owned Inventory" },
  { value: "contributions", label: "Contributions" },
  { value: "submissions", label: "Submitted Data" },
  { value: "perspective_annotations", label: "Perspective Annotations" },
  { value: "pull_jobs", label: "Source Pull Jobs" }
] as const;

export default async function DatabasePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const table = tableOptions.some(t => t.value === params.table) ? params.table! : "sources";
  const q = params.q ?? "";

  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  let data: any[] = [];
  let dbOffline = false;

  try {
    switch (table) {
      case "robots":
        data = await prisma.robotModel.findMany({
          where: q ? { canonicalName: { contains: q, mode: "insensitive" } } : {},
          orderBy: { createdAt: "desc" },
          take: 250
        });
        break;
      case "owned_inventory":
        data = await prisma.ownedInventory.findMany({
          where: q ? { displayName: { contains: q, mode: "insensitive" } } : {},
          orderBy: { createdAt: "desc" },
          take: 250
        });
        break;
      case "contributions":
        data = await prisma.contribution.findMany({
          where: q ? { title: { contains: q, mode: "insensitive" } } : {},
          orderBy: { createdAt: "desc" },
          take: 250
        });
        break;
      case "submissions":
        data = await prisma.submittedData.findMany({
          where: q ? { title: { contains: q, mode: "insensitive" } } : {},
          orderBy: { createdAt: "desc" },
          take: 250
        });
        break;
      case "perspective_annotations":
        data = await prisma.perspectiveAnnotation.findMany({
          where: q ? { perspectiveTheme: { contains: q, mode: "insensitive" } } : {},
          orderBy: { createdAt: "desc" },
          take: 250
        });
        break;
      case "pull_jobs":
        data = await prisma.sourcePullJob.findMany({
          where: q ? { query: { contains: q, mode: "insensitive" } } : {},
          orderBy: { createdAt: "desc" },
          take: 250
        });
        break;
      default:
        data = await prisma.sourceRecord.findMany({
          where: q ? { title: { contains: q, mode: "insensitive" } } : {},
          orderBy: { createdAt: "desc" },
          take: 250
        });
    }
  } catch (error) {
    console.error("Database connection failed in database browser:", error);
    dbOffline = true;
    
    // Representative fallback datasets for each table option.
    if (table === "robots") {
      data = [
        { id: "1", canonicalName: "Dinsaw Mini", manufacturer: "CT Asia Robotics", countryOfOrigin: "Thailand", robotType: "humanoid", embodimentLevel: "upper_body", description: "Elderly care assistive platform.", createdAt: new Date() },
        { id: "2", canonicalName: "NAO", manufacturer: "SoftBank Robotics", countryOfOrigin: "Japan", robotType: "humanoid", embodimentLevel: "full_humanoid", description: "Education and research legged model.", createdAt: new Date() }
      ];
    } else if (table === "owned_inventory") {
      data = [
        { id: "mock-inv-1", displayName: "NAO Education Platform B", ownershipStatus: "borrowed", visibility: "public", custodian: "FIBO KMUTT", locationLabel: "Robotics Lab", serialNumber: "NAO-62-9981A", publicSerialSafe: true, notes: "Loaned.", createdAt: new Date() },
        { id: "mock-inv-2", displayName: "Dinsaw Eldercare Unit A", ownershipStatus: "owned", visibility: "private", custodian: "Siriraj Hospital", locationLabel: "Ward 12", serialNumber: "DS-2026-991A", publicSerialSafe: false, notes: "Private unit.", createdAt: new Date() }
      ];
    } else if (table === "contributions") {
      data = [
        { id: "mock-c-1", title: "Thai HRI research seed", contributorName: "Dr. Somchai", organization: "FIBO", contributionType: "research_paper", license: "MIT", verificationStatus: "VERIFIED", createdAt: new Date() }
      ];
    } else if (table === "submissions") {
      data = [
        { id: "mock-sub-1", title: "NAO Robot deployment KMUTT", submissionType: "source_url", status: "QUEUED", submitterName: "Ajahn Somchai", notes: "Please ingest.", createdAt: new Date() }
      ];
    } else if (table === "perspective_annotations") {
      data = [
        { id: "mock-pa-1", perspectiveTheme: "economic_impact", stance: "SUPPORTIVE", confidence: 0.92, createdAt: new Date() },
        { id: "mock-pa-2", perspectiveTheme: "safety_concern", stance: "NEUTRAL", confidence: 0.65, createdAt: new Date() }
      ];
    } else if (table === "pull_jobs") {
      data = [
        { id: "mock-pj-1", adapter: "facebook", query: "Thailand humanoid", status: "SUCCEEDED", recordsFound: 5, recordsSaved: 5, createdAt: new Date() }
      ];
    } else {
      // Default: sources
      data = [
        { id: "1", platform: "facebook", title: "KMUTT FIBO NAO robot study", sourceUrl: "https://facebook.com/kmuttoficial/123", relevanceStatus: "ACCEPTED", relevanceConfidence: 0.94, publishedAt: new Date(), createdAt: new Date() },
        { id: "2", platform: "youtube", title: "Dinsaw mini robotic nursing home test", sourceUrl: "https://youtube.com/watch?v=abc", relevanceStatus: "ACCEPTED", relevanceConfidence: 0.88, publishedAt: new Date(), createdAt: new Date() }
      ];
    }

    // Simple local text filter for search query parameter
    if (q) {
      const qLower = q.toLowerCase();
      data = data.filter(item => 
        Object.values(item).some(val => 
          val && typeof val === "string" && val.toLowerCase().includes(qLower)
        )
      );
    }
  }

  // Column headers based on keys in records
  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.databaseTitle}</h1>
          <p className="muted">{t.databaseDesc}</p>
        </div>
        <div className="toolbar">
          <a className="button primary" href={`/api/export?table=${table}`} download>
            Export CSV ({table.replace(/_/g, " ")})
          </a>
        </div>
      </div>

      {dbOffline && (
        <div className="notice" style={{ backgroundColor: "#fffbeb", borderLeftColor: "var(--warning)", marginBottom: "16px" }}>
          <strong>Database Offline:</strong> Live PostgreSQL is unavailable. Showing sample rows that match the selected table shape.
        </div>
      )}

      {/* Selector & Search Form */}
      <form method="GET" className="panel grid" style={{ gridTemplateColumns: "1fr 2fr 80px", gap: "10px", alignItems: "end", marginBottom: "16px" }}>
        <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          Table selection
          <select name="table" defaultValue={table}>
            {tableOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          Text Search within table
          <input name="q" defaultValue={q} placeholder={`Search fields in ${table}...`} />
        </label>

        <button type="submit" className="primary" style={{ minHeight: "36px" }}>Query</button>
      </form>

      {/* Dense Monospace Grid view */}
      <div className="panel" style={{ padding: "12px" }}>
        <h2 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          Table Preview: <code>{table}</code> ({data.length} records)
        </h2>
        
        <div className="table-wrap" style={{ border: "1px solid var(--border)", borderRadius: "4px" }}>
          <table style={{ fontFamily: "monospace", fontSize: "11px", whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ background: "var(--surface-muted)" }}>
                {headers.map(h => (
                  <th key={h} style={{ borderRight: "1px solid var(--border)", padding: "6px 8px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                  {headers.map(h => {
                    const val = row[h];
                    let displayVal = "";
                    if (val === null || val === undefined) {
                      displayVal = "NULL";
                    } else if (val instanceof Date) {
                      displayVal = val.toLocaleString();
                    } else if (typeof val === "object") {
                      displayVal = JSON.stringify(val);
                    } else {
                      displayVal = String(val);
                    }
                    return (
                      <td key={h} style={{ borderRight: "1px solid var(--border)", padding: "6px 8px", color: val === null ? "var(--text-secondary)" : "inherit" }}>
                        {displayVal.length > 50 ? `${displayVal.slice(0, 48)}...` : displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!data.length && (
                <tr>
                  <td className="empty" colSpan={headers.length || 1} style={{ textAlign: "center", padding: "20px" }}>
                    No records found in this table query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
