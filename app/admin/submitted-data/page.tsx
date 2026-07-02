import { cookies } from "next/headers";
import Link from "next/link";
import { updateSubmissionStatus } from "@/app/actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ selectedId?: string }>;

export default async function AdminSubmittedDataPage({ searchParams }: { searchParams: SearchParams }) {
  const cookieStore = await cookies();
  const currentRole = cookieStore.get("user_role")?.value;
  const isAdmin = currentRole === "ADMIN";

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: "560px", margin: "40px auto", textAlign: "center" }} className="panel">
        <h1 style={{ color: "var(--danger)" }}>Access Denied</h1>
        <p className="muted" style={{ margin: "14px 0" }}>
          You must have the <strong>ADMIN</strong> role to view the review queue or perform administrative actions.
        </p>
        <Link href="/profile" className="button primary">
          Go to Profile & Login as Admin
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const selectedId = params.selectedId;

  let items: any[] = [];
  let dbOffline = false;

  try {
    items = await prisma.submittedData.findMany({ 
      orderBy: { createdAt: "desc" }, 
      take: 100 
    });
  } catch (error) {
    console.error("Database connection failed in admin submitted-data:", error);
    dbOffline = true;
    items = [
      {
        id: "mock-s-1",
        title: "NAO Robot deployment at KMUTT",
        url: "https://facebook.com/kmuttoficial/123",
        submissionType: "source_url",
        submitterName: "Ajahn Somchai",
        submitterContact: "somchai@university.ac.th",
        status: "QUEUED",
        notes: "Initial deployment test with children at FIBO. Automated relevance analysis indicates high HRI focus.",
        createdAt: new Date()
      },
      {
        id: "mock-s-2",
        title: "Dinsaw mini review video",
        url: "https://youtube.com/watch?v=abc",
        submissionType: "source_url",
        submitterName: "Anonymous",
        submitterContact: "not provided",
        status: "NEEDS_REVIEW",
        notes: "Product review of CT Asia robotics hospital service mini units.",
        createdAt: new Date()
      }
    ];
  }

  const selectedItem = items.find(item => item.id === selectedId) || items[0];

  return (
    <>
      <div className="topline">
        <div>
          <h1>Admin Review Queue</h1>
          <p className="muted">
            Inspect, edit, and approve community submissions before indexing them into the public atlas.
          </p>
        </div>
      </div>

      {dbOffline && (
        <div className="notice" style={{ backgroundColor: "#fffbeb", borderLeftColor: "var(--warning)", marginBottom: "16px" }}>
          <strong>⚠️ Database Offline:</strong> Live PostgreSQL connection is unavailable (normal for Vercel preview environments). Displaying high-fidelity simulated submissions.
        </div>
      )}

      <div className="two" style={{ gridTemplateColumns: "1fr 400px", gap: "16px" }}>
        
        {/* Left Panel: Submissions List */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Submitted Item</th>
                <th>Type</th>
                <th>Status</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr 
                  key={item.id} 
                  style={{ 
                    cursor: "pointer", 
                    backgroundColor: selectedItem?.id === item.id ? "var(--surface-muted)" : "transparent"
                  }}
                >
                  <td>
                    <Link href={`/admin/submitted-data?selectedId=${item.id}`} style={{ color: "inherit", display: "block" }}>
                      <strong>{item.title}</strong>
                      <div className="muted" style={{ fontSize: "11px", textOverflow: "ellipsis", overflow: "hidden", maxWidth: "240px", whiteSpace: "nowrap" }}>
                        {item.url ?? item.notes}
                      </div>
                    </Link>
                  </td>
                  <td>
                    <span className="badge" style={{ fontSize: "11px" }}>{item.submissionType.replace(/_/g, " ")}</span>
                  </td>
                  <td>
                    <span className={`badge ${item.status === "APPROVED" ? "ok" : item.status === "REJECTED" ? "danger" : "warn"}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "11px" }}>
                    {item.createdAt.toLocaleDateString()}
                  </td>
                  <td>
                    <Link href={`/admin/submitted-data?selectedId=${item.id}`} className="button" style={{ minHeight: "auto", padding: "4px 8px", fontSize: "11px" }}>
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="empty" colSpan={5}>No submissions to review.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Panel: Side-by-Side In-Depth Detail Inspector */}
        <aside className="panel" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {selectedItem ? (
            <>
              <div>
                <span className="badge" style={{ textTransform: "uppercase", fontSize: "10px" }}>
                  {selectedItem.submissionType.replace(/_/g, " ")}
                </span>
                <h2 style={{ fontSize: "18px", marginTop: "4px" }}>{selectedItem.title}</h2>
                <div className="muted" style={{ fontSize: "11px" }}>
                  Submitted on {selectedItem.createdAt.toLocaleString()}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                {selectedItem.url && (
                  <div>
                    <strong>Target URL:</strong><br />
                    <a href={selectedItem.url} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all", fontSize: "12px" }}>
                      {selectedItem.url}
                    </a>
                  </div>
                )}
                
                {selectedItem.notes && (
                  <div>
                    <strong>Submitter Notes:</strong>
                    <p style={{ margin: "4px 0", background: "var(--surface-muted)", padding: "8px", borderRadius: "6px", fontSize: "12px", fontStyle: "italic" }}>
                      "{selectedItem.notes}"
                    </p>
                  </div>
                )}

                <div style={{ background: "var(--surface-muted)", padding: "8px", borderRadius: "6px", fontSize: "12px" }}>
                  <strong>Submitter Metadata:</strong>
                  <div style={{ marginTop: "4px" }}>
                    Name: {selectedItem.submitterName || "Anonymous"}<br />
                    Contact: {selectedItem.submitterContact || "Not provided"}
                  </div>
                </div>
              </div>

              {/* Relationship Preview */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <strong>Graph Relationship Preview:</strong>
                <div style={{ marginTop: "8px", background: "#f8faf9", border: "1px solid var(--border)", padding: "10px", borderRadius: "6px", fontSize: "11px" }}>
                  {selectedItem.submissionType === "robot_model" ? (
                    <div>
                      🟢 Node addition:<br />
                      <code>[RobotModel: {selectedItem.title}]</code> (type: robot)
                    </div>
                  ) : selectedItem.submissionType === "contribution_claim" ? (
                    <div>
                      🟢 Node connection:<br />
                      <code>[{selectedItem.submitterName || "Contributor"}]</code><br />
                      &nbsp;&nbsp;&nbsp;&nbsp;→ <code>contributed_to</code> →<br />
                      <code>[Contribution: {selectedItem.title}]</code>
                    </div>
                  ) : (
                    <div>
                      🟢 Node addition:<br />
                      <code>[Source: {selectedItem.title}]</code><br />
                      &nbsp;&nbsp;&nbsp;&nbsp;→ <code>discusses</code> →<br />
                      <code>[Thailand robotics]</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Forms */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "auto" }}>
                <strong>Verification Verdict:</strong>
                {dbOffline ? (
                  <p className="muted" style={{ fontSize: "11px", margin: "4px 0" }}>
                    Verdict actions disabled while database is offline.
                  </p>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <form action={updateSubmissionStatus.bind(null, selectedItem.id, "APPROVED")} style={{ flex: 1 }}>
                        <button type="submit" className="primary" style={{ width: "100%", background: "var(--success)", borderColor: "var(--success)", minHeight: "38px" }}>
                          Approve
                        </button>
                      </form>
                      <form action={updateSubmissionStatus.bind(null, selectedItem.id, "REJECTED")} style={{ flex: 1 }}>
                        <button type="submit" className="button" style={{ width: "100%", color: "var(--danger)", borderColor: "var(--danger)", minHeight: "38px" }}>
                          Reject
                        </button>
                      </form>
                    </div>
                    <form action={updateSubmissionStatus.bind(null, selectedItem.id, "NEEDS_REVIEW")} style={{ marginTop: "8px" }}>
                      <button type="submit" className="button" style={{ width: "100%", minHeight: "38px" }}>
                        Mark Pending / Review
                      </button>
                    </form>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="empty">Select a submission from the list to inspect and verify.</div>
          )}
        </aside>
      </div>
    </>
  );
}
