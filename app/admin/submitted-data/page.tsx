import { cookies } from "next/headers";
import Link from "next/link";
import { updateSubmissionStatus } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ selectedId?: string }>;

export default async function AdminSubmittedDataPage({ searchParams }: { searchParams: SearchParams }) {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);
  const currentRole = cookieStore.get("user_role")?.value;
  const isAdmin = currentRole === "ADMIN";

  const localT = {
    en: {
      denied: "Access Denied",
      deniedDesc: "You must have the ADMIN role to view the review queue or perform administrative actions.",
      goProfile: "Go to Profile & Login as Admin",
      titleCol: "Submitted Item",
      typeCol: "Type",
      statusCol: "Status",
      dateCol: "Date",
      actionCol: "Action",
      inspectBtn: "Inspect",
      empty: "No submissions to review.",
      submittedOn: "Submitted on",
      targetUrl: "Target URL",
      subNotes: "Submitter Notes",
      subMeta: "Submitter Metadata",
      subName: "Name",
      subContact: "Contact",
      graphPreview: "Graph Relationship Preview",
      verdict: "Verification Verdict",
      approveBtn: "Approve",
      rejectBtn: "Reject",
      markBtn: "Mark Pending / Review",
      emptyInspector: "Select a submission from the list to inspect and verify."
    },
    th: {
      denied: "ปฏิเสธการเข้าถึง",
      deniedDesc: "คุณต้องมีบทบาทเป็นผู้ดูแลระบบ (ADMIN) เพื่อเข้าสู่คิวการตรวจสอบและบริหารจัดการ",
      goProfile: "ไปที่แท็บโปรไฟล์และเข้าใช้ในฐานะผู้ดูแลระบบ",
      titleCol: "รายการที่ส่งเข้ามา",
      typeCol: "ประเภท",
      statusCol: "สถานะ",
      dateCol: "วันที่ส่ง",
      actionCol: "การจัดการ",
      inspectBtn: "ตรวจสอบ",
      empty: "ไม่มีรายการที่ส่งมารอการตรวจสอบ",
      submittedOn: "ส่งข้อมูลเมื่อ",
      targetUrl: "ลิงก์เป้าหมาย",
      subNotes: "หมายเหตุจากผู้ส่ง",
      subMeta: "ข้อมูลของผู้ส่งข้อมูล",
      subName: "ชื่อ",
      subContact: "การติดต่อ",
      graphPreview: "ตัวอย่างความสัมพันธ์ในแผนผังเครือข่าย",
      verdict: "คำตัดสินการตรวจสอบ",
      approveBtn: "อนุมัติข้อมูล",
      rejectBtn: "ปฏิเสธ",
      markBtn: "ตั้งเป็นรอตรวจสอบ / ทบทวน",
      emptyInspector: "กรุณาเลือกรายการที่ส่งเข้ามาเพื่อทำการตรวจสอบความถูกต้องของข้อมูล"
    }
  }[lang];

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: "560px", margin: "40px auto", textAlign: "center" }} className="panel">
        <h1 style={{ color: "var(--danger)" }}>{localT.denied}</h1>
        <p className="muted" style={{ margin: "14px 0" }}>
          {localT.deniedDesc}
        </p>
        <Link href="/profile" className="button primary">
          {localT.goProfile}
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const selectedId = params.selectedId;

  const items = await prisma.submittedData.findMany({ 
    where: { status: { in: ["QUEUED", "NEEDS_REVIEW"] } },
    orderBy: { createdAt: "desc" }, 
    take: 100 
  });

  const selectedItem = items.find(item => item.id === selectedId) || items[0];

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.adminTitle}</h1>
          <p className="muted">
            {t.adminDesc}
          </p>
        </div>
        <Link href="/admin/cms" className="button primary">
          CMS
        </Link>
      </div>

      <div className="two" style={{ gap: "16px" }}>
        
        {/* Left Panel: Submissions List */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{localT.titleCol}</th>
                <th>{localT.typeCol}</th>
                <th>{localT.statusCol}</th>
                <th>{localT.dateCol}</th>
                <th>{localT.actionCol}</th>
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
                      {localT.inspectBtn}
                    </Link>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="empty" colSpan={5}>{localT.empty}</td>
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
                  {localT.submittedOn} {selectedItem.createdAt.toLocaleString()}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                {selectedItem.url && (
                  <div>
                    <strong>{localT.targetUrl}:</strong><br />
                    <a href={selectedItem.url} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all", fontSize: "12px" }}>
                      {selectedItem.url}
                    </a>
                  </div>
                )}
                
                {selectedItem.notes && (
                  <div>
                    <strong>{localT.subNotes}:</strong>
                    <p style={{ margin: "4px 0", background: "var(--surface-muted)", padding: "8px", borderRadius: "6px", fontSize: "12px", fontStyle: "italic" }}>
                      "{selectedItem.notes}"
                    </p>
                  </div>
                )}

                <div style={{ background: "var(--surface-muted)", padding: "8px", borderRadius: "6px", fontSize: "12px" }}>
                  <strong>{localT.subMeta}:</strong>
                  <div style={{ marginTop: "4px" }}>
                    {localT.subName}: {selectedItem.submitterName || "Anonymous"}<br />
                    {localT.subContact}: {selectedItem.submitterContact || "Not provided"}
                  </div>
                </div>
              </div>

              {/* Relationship Preview */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <strong>{localT.graphPreview}:</strong>
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
                <strong>{localT.verdict}:</strong>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <form action={updateSubmissionStatus.bind(null, selectedItem.id, "APPROVED")} style={{ flex: 1 }}>
                    <button type="submit" className="primary" style={{ width: "100%", background: "var(--success)", borderColor: "var(--success)", minHeight: "38px" }}>
                      {localT.approveBtn}
                    </button>
                  </form>
                  <form action={updateSubmissionStatus.bind(null, selectedItem.id, "REJECTED")} style={{ flex: 1 }}>
                    <button type="submit" className="button" style={{ width: "100%", color: "var(--danger)", borderColor: "var(--danger)", minHeight: "38px" }}>
                      {localT.rejectBtn}
                    </button>
                  </form>
                </div>
                <form action={updateSubmissionStatus.bind(null, selectedItem.id, "NEEDS_REVIEW")} style={{ marginTop: "8px" }}>
                  <button type="submit" className="button" style={{ width: "100%", minHeight: "38px" }}>
                    {localT.markBtn}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty">{localT.emptyInspector}</div>
          )}
        </aside>
      </div>
    </>
  );
}
