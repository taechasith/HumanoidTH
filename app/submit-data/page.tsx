import { prisma } from "@/lib/prisma";
import { createSubmission } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SubmitDataPage() {
  const recentSubmissions = await prisma.submittedData.findMany({
    orderBy: { createdAt: "desc" },
    take: 15
  });

  return (
    <>
      <div className="topline">
        <div>
          <h1>Submit Signal or Record</h1>
          <p className="muted">
            Submit source evidence, robot model details, contribution claims, corrections, or inventory updates for review.
          </p>
        </div>
      </div>



      <div className="two" style={{ gridTemplateColumns: "1fr 320px", gap: "16px" }}>
        
        {/* Left Side: Submission Form */}
        <form className="form panel" action={createSubmission}>
          <label>
            Submission Type
            <select name="submissionType" required>
              <option value="source_url">Source URL (News, Article, Blog)</option>
              <option value="robot_model">Robot Model Spec</option>
              <option value="owned_inventory_update">Owned Inventory Unit Update</option>
              <option value="contribution_claim">Contribution Claim (Paper, Repo, Dataset)</option>
              <option value="event_demo_record">Event or Public Demo Record</option>
              <option value="correction_request">Database Correction Request</option>
            </select>
          </label>
          
          <label>
            Title / Identifier
            <input name="title" required placeholder="e.g. NAO Robot deployment at KMUTT, Dinsaw Mini review" />
          </label>
          
          <label>
            Reference URL
            <input name="url" type="url" placeholder="https://example.com/source-evidence" />
          </label>
          
          <label>
            Description / Core Evidence Notes
            <textarea name="notes" rows={5} placeholder="Provide source excerpts, model details, correction notes, or inventory context. Avoid sensitive private data unless needed for internal review." />
          </label>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label>
              Your Name
              <input name="submitterName" placeholder="Ajahn Somchai" />
            </label>
            <label>
              Contact Email / Phone
              <input name="submitterContact" placeholder="somchai@university.ac.th" />
            </label>
          </div>

          <button className="primary" type="submit" style={{ marginTop: "10px" }}>
            Submit for Review
          </button>
        </form>

        {/* Right Side: Ingestion Policy */}
        <aside className="panel" style={{ fontSize: "13px" }}>
          <h2>Submission Policy</h2>
          <p className="muted" style={{ marginBottom: "10px" }}>
            Thank you for contributing to the Thailand Humanoid Atlas. All submissions are stored in the review queue before they become public records.
          </p>
          <ul style={{ paddingLeft: "18px", margin: "6px 0", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>Submitted URLs and notes are evidence for reviewer decisions.</li>
            <li>Data pull jobs can classify external source records separately.</li>
            <li>Administrators approve, reject, or request more information before indexing submissions.</li>
            <li>Private inventory fields, such as serial numbers, should stay hidden from public views.</li>
          </ul>
        </aside>
      </div>

      {/* Submission Tracking Section */}
      <h2 style={{ marginTop: "24px" }}>Signal Tracking & Statuses</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title / Reference</th>
              <th>Type</th>
              <th>Submitter</th>
              <th>Pipeline Status</th>
              <th>Notes & Evidence</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentSubmissions.map((sub) => {
              // Extract relevance/AI meta if available
              let metaStr = "Manual review pending";
              let confidenceStr = "";

              if (sub.payloadJson && typeof sub.payloadJson === "object") {
                const payload = sub.payloadJson as Record<string, any>;
                if (payload.confidence) {
                  confidenceStr = ` (Confidence: ${Number(payload.confidence).toFixed(2)})`;
                }
                if (payload.reason) {
                  metaStr = `AI Reason: ${payload.reason}`;
                }
              }

              return (
                <tr key={sub.id}>
                  <td>
                    <strong>{sub.title}</strong>
                    {sub.url && (
                      <div style={{ marginTop: "4px" }}>
                        <a href={sub.url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", wordBreak: "break-all" }}>
                          {sub.url}
                        </a>
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{ textTransform: "capitalize", fontSize: "11px" }}>
                      {sub.submissionType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td>{sub.submitterName || "Anonymous"}</td>
                  <td>
                    <span className={`badge ${
                      sub.status === "APPROVED" 
                        ? "ok" 
                        : sub.status === "REJECTED" || sub.status === "FAILED"
                        ? "danger" 
                        : "warn"
                    }`}>
                      {sub.status.toLowerCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "250px", wordBreak: "break-word" }}>
                    <div>{sub.notes || "No notes."}</div>
                    {confidenceStr && (
                      <div style={{ marginTop: "4px", fontWeight: "bold" }}>
                        {metaStr}{confidenceStr}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: "12px" }}>
                    {sub.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {!recentSubmissions.length && (
              <tr>
                <td className="empty" colSpan={6}>No recent submissions logged.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
