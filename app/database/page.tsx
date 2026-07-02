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

  // Convert elements to serializable rows
  const rows = JSON.parse(JSON.stringify(data)) as Record<string, unknown>[];

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.databaseTitle}</h1>
          <p className="muted">
            {t.databaseDesc}
          </p>
        </div>
        <div className="toolbar">
          <a 
            className="button primary" 
            href={`/api/export?table=${table}`}
            download={`${table}_export.csv`}
          >
            Export CSV
          </a>
        </div>
      </div>

      <form className="panel toolbar" method="GET" action="/database">
        <select name="table" defaultValue={table}>
          {tableOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input 
          name="q" 
          defaultValue={q} 
          placeholder="Search by name, title, or query..." 
          style={{ flex: 1, minWidth: "220px" }}
        />
        <button className="primary" type="submit">Search</button>
        {q && <a href={`/database?table=${table}`} className="button">Clear</a>}
      </form>

      <div className="table-wrap" style={{ marginTop: "14px", overflowY: "auto", maxHeight: "600px" }}>
        <table>
          {rows.length ? (
            <>
              <thead>
                <tr>
                  {Object.keys(rows[0]).map((key) => (
                    <th key={key}>{key.replace(/([A-Z])/g, "_$1").toLowerCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={String(row.id)}>
                    {Object.keys(rows[0]).map((key) => {
                      const val = row[key];
                      let displayVal = "";
                      if (typeof val === "object" && val !== null) {
                        displayVal = JSON.stringify(val);
                      } else {
                        displayVal = String(val ?? "");
                      }
                      
                      // Truncate long texts/URLs for clean display
                      const isLongUrl = displayVal.startsWith("http") && displayVal.length > 50;
                      const displayString = isLongUrl 
                        ? displayVal.substring(0, 47) + "..." 
                        : (displayVal.length > 100 ? displayVal.substring(0, 97) + "..." : displayVal);

                      return (
                        <td 
                          key={key} 
                          title={displayVal} 
                          style={{ 
                            fontSize: "11px", 
                            fontFamily: "monospace", 
                            maxHeight: "60px",
                            whiteSpace: "nowrap", 
                            overflow: "hidden", 
                            textOverflow: "ellipsis",
                            maxWidth: "200px"
                          }}
                        >
                          {isLongUrl ? (
                            <a href={displayVal} target="_blank" rel="noreferrer">{displayString}</a>
                          ) : (
                            displayString
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <tbody>
              <tr>
                <td className="empty">No rows found in this table.</td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </>
  );
}
