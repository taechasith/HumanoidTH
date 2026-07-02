import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ mode?: string }>;

export default async function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const isPublic = params.mode === "public";
  
  let inventory = [];
  let dbOffline = false;

  try {
    inventory = await prisma.ownedInventory.findMany({
      include: { robotModel: true },
      orderBy: { updatedAt: "desc" }
    });
  } catch (error) {
    console.error("Database connection failed in inventory page:", error);
    dbOffline = true;
    // High-fidelity fallback simulated records
    inventory = [
      {
        id: "mock-1",
        displayName: "NAO Education Platform B",
        ownershipStatus: "borrowed",
        visibility: "public",
        custodian: "FIBO KMUTT",
        conditionStatus: "excellent",
        locationLabel: "Robotics Lab, 3rd Floor",
        serialNumber: "NAO-62-9981A",
        publicSerialSafe: true,
        accessories: JSON.stringify(["Charger", "Transport Case", "Kinetic Sensors"]),
        documentationLinks: JSON.stringify(["https://example.com/nao-docs", "https://example.com/nao-safety"]),
        notes: "On active loan from public grant for human-robot interaction studies.",
        updatedAt: new Date(),
        robotModel: {
          canonicalName: "NAO",
          manufacturer: "SoftBank Robotics"
        }
      },
      {
        id: "mock-2",
        displayName: "Dinsaw Eldercare Unit A",
        ownershipStatus: "owned",
        visibility: "private",
        custodian: "Siriraj Hospital Lab",
        conditionStatus: "good",
        locationLabel: "Geriatric Ward, Bed 12",
        serialNumber: "DS-2026-991A",
        publicSerialSafe: false,
        accessories: JSON.stringify(["Power Base", "Emergency Call Button"]),
        documentationLinks: JSON.stringify(["https://example.com/dinsaw-setup"]),
        notes: "Private beta unit. Subject to patient confidentiality rules. Exact Ward locations are masked.",
        updatedAt: new Date(),
        robotModel: {
          canonicalName: "Dinsaw Mini",
          manufacturer: "CT Asia Robotics"
        }
      }
    ];
  }

  return (
    <>
      <div className="topline">
        <div>
          <h1>Owned Inventory</h1>
          <p className="muted">
            Tracking hardware models owned, borrowed, or operated by the team.
          </p>
        </div>
        <div className="toolbar">
          <Link 
            className={`button ${!isPublic ? "primary" : ""}`} 
            href="/inventory?mode=operator"
          >
            Operator Mode (Private)
          </Link>
          <Link 
            className={`button ${isPublic ? "primary" : ""}`} 
            href="/inventory?mode=public"
          >
            Public-Safe Mode
          </Link>
        </div>
      </div>

      {dbOffline && (
        <div className="notice" style={{ backgroundColor: "#fffbeb", borderLeftColor: "var(--warning)", marginBottom: "16px" }}>
          <strong>⚠️ Database Offline:</strong> Live PostgreSQL connection is unavailable (normal for Vercel preview environments). Displaying high-fidelity simulated hardware units.
        </div>
      )}

      {!isPublic ? (
        <div className="notice" style={{ backgroundColor: "#fdf2f2", borderLeftColor: "var(--danger)" }}>
          <strong>⚠️ Access Warning:</strong> You are currently in <strong>Operator Mode</strong>. 
          Sensitive internal data (serial numbers, exact locations, and repair logs) are visible on screen. 
          Do not share this view during public presentations or screenshots.
        </div>
      ) : (
        <div className="notice" style={{ backgroundColor: "#f0fdf4", borderLeftColor: "var(--success)" }}>
          <strong>🛡️ Public-Safe Mode Active:</strong> Serial numbers, exact locations, and private logs are masked or hidden.
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Robot Model</th>
              <th>Display Name</th>
              <th>Status / Ownership</th>
              <th>Custodian</th>
              <th>Condition</th>
              <th>Location</th>
              <th>Serial Number</th>
              <th>Accessories & Docs</th>
              <th>Notes / Repair Log</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => {
              // Parsing accessories and documentation links
              let accs: string[] = [];
              let docs: string[] = [];
              try {
                accs = JSON.parse(item.accessories as string);
                docs = JSON.parse(item.documentationLinks as string);
              } catch (e) {
                // Fallbacks if not JSON strings
              }

              // Privacy masking rules
              const displayLocation = isPublic ? "🔒 [Masked]" : (item.locationLabel ?? "N/A");
              const displaySerial = isPublic 
                ? (item.publicSerialSafe ? item.serialNumber : "🔒 [Masked]") 
                : (item.serialNumber ?? "N/A");
              const displayNotes = isPublic ? "🔒 [Masked for privacy]" : (item.notes ?? "No logs.");

              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.robotModel?.canonicalName ?? "Unknown Model"}</strong>
                    <br />
                    <span className="muted">{item.robotModel?.manufacturer}</span>
                  </td>
                  <td>{item.displayName}</td>
                  <td>
                    <span className="badge">{item.ownershipStatus}</span>
                    <br />
                    <span className={`badge ${item.visibility === "public" ? "ok" : "warn"}`} style={{ marginTop: 4 }}>
                      {item.visibility}
                    </span>
                  </td>
                  <td>{item.custodian ?? "Unassigned"}</td>
                  <td>
                    <span className={`badge ${item.conditionStatus === "excellent" || item.conditionStatus === "good" ? "ok" : "warn"}`}>
                      {item.conditionStatus ?? "unknown"}
                    </span>
                  </td>
                  <td>{displayLocation}</td>
                  <td><code>{displaySerial}</code></td>
                  <td>
                    <div style={{ fontSize: "12px" }}>
                      <strong>Accs:</strong> {accs.length ? accs.join(", ") : "none"}
                    </div>
                    <div style={{ fontSize: "12px", marginTop: 4 }}>
                      <strong>Docs:</strong> {docs.length ? (
                        docs.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer" style={{ marginRight: 6 }}>
                            [Doc {i + 1}]
                          </a>
                        ))
                      ) : "none"}
                    </div>
                  </td>
                  <td style={{ maxWidth: "250px", wordBreak: "break-word" }}>{displayNotes}</td>
                  <td>{item.updatedAt.toLocaleDateString()}</td>
                </tr>
              );
            })}
            {!inventory.length && (
              <tr>
                <td className="empty" colSpan={10}>
                  No inventory records found. Run database seed or submit an inventory update.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
