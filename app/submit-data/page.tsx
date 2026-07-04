import { cookies } from "next/headers";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { createSubmission } from "@/app/actions";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Submit Robotics Data",
  description: "Submit source links, robot model details, contribution claims, corrections, and inventory updates for Thailand Humanoid Atlas review.",
  alternates: { canonical: "/submit-data" }
};

export default async function SubmitDataPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const recentSubmissions = await prisma.submittedData.findMany({
    orderBy: { createdAt: "desc" },
    take: 15
  });

  const localT = {
    en: {
      type: "Submission Type",
      title: "Title / Identifier",
      refUrl: "Reference URL",
      desc: "Description / Core Source Notes",
      name: "Your Name",
      contact: "Contact Email / Phone",
      submitBtn: "Submit for Verification Review",
      recent: "Recent Submissions Queue",
      itemCol: "Item",
      typeCol: "Type",
      statusCol: "Status",
      empty: "No submissions queued yet."
    },
    th: {
      type: "ประเภทการส่งข้อมูล",
      title: "หัวข้อ / ตัวระบุข้อมูล",
      refUrl: "ลิงก์อ้างอิง",
      desc: "คำอธิบาย / รายละเอียดแหล่งข้อมูลอ้างอิง",
      name: "ชื่อของคุณ",
      contact: "ข้อมูลติดต่อ (อีเมล / โทรศัพท์)",
      submitBtn: "ส่งข้อมูลเพื่อรอการตรวจสอบ",
      recent: "คิวรายการที่ส่งล่าสุด",
      itemCol: "รายการ",
      typeCol: "ประเภท",
      statusCol: "สถานะ",
      empty: "ยังไม่มีรายการข้อมูลที่ส่งในคิว"
    }
  }[lang];

  return (
    <>
      <div className="topline">
        <div>
          <h1>{t.submitTitle}</h1>
          <p className="muted">
            {t.submitDesc}
          </p>
        </div>
      </div>

      <div className="two" style={{ gap: "16px" }}>
        
        {/* Left Side: Submission Form */}
        <form className="form panel" action={createSubmission}>
          <label>
            {localT.type}
            <select name="submissionType" required>
              <option value="source_url">{lang === "th" ? "ลิงก์แหล่งที่มา (ข่าว, บทความ)" : "Source URL (News, Article, Blog)"}</option>
              <option value="robot_model">{lang === "th" ? "ข้อมูลจำเพาะรุ่นหุ่นยนต์" : "Robot Model Spec"}</option>
              <option value="owned_inventory_update">{lang === "th" ? "อัปเดตรายการหุ่นยนต์ของทีม" : "Owned Inventory Unit Update"}</option>
              <option value="contribution_claim">{lang === "th" ? "ผลงานวิจัย / คลังโค้ด / ชุดข้อมูล" : "Contribution Claim (Paper, Repo)"}</option>
              <option value="event_demo_record">{lang === "th" ? "บันทึกการจัดงาน / สาธิตสาธารณะ" : "Event or Public Demo Record"}</option>
              <option value="correction_request">{lang === "th" ? "คำขอแก้ไขฐานข้อมูล" : "Database Correction Request"}</option>
            </select>
          </label>
          
          <label>
            {localT.title}
            <input name="title" required placeholder="e.g. NAO Robot deployment at KMUTT, Dinsaw Mini review" />
          </label>
          
          <label>
            {localT.refUrl}
            <input name="url" type="url" placeholder="https://example.com/source-link" />
          </label>
          
          <label>
            {localT.desc}
            <textarea name="notes" rows={5} placeholder="Provide source excerpts, model details, correction notes, or inventory context." />
          </label>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
            <label>
              {localT.name}
              <input name="submitterName" placeholder="Ajahn Somchai" />
            </label>
            <label>
              {localT.contact}
              <input name="submitterContact" placeholder="somchai@university.ac.th" />
            </label>
          </div>

          <button className="primary" type="submit" style={{ marginTop: "10px" }}>
            {localT.submitBtn}
          </button>
        </form>

        {/* Right Side: Ingestion Policy */}
        <aside className="panel" style={{ fontSize: "13px" }}>
          <h2>{lang === "th" ? "นโยบายการส่งข้อมูล" : "Submission Policy"}</h2>
          <p className="muted" style={{ marginBottom: "10px" }}>
            {lang === "th" ? "ขอบคุณที่เป็นส่วนหนึ่งในการส่งข้อมูลให้ระบบบันทึก ทุกข้อมูลที่ส่งเข้ามาจะเข้าสู่คิวการตรวจสอบของทีมงานก่อนการนำไปเผยแพร่ต่อสาธารณะ" : "Thank you for contributing to the Thailand Humanoid Atlas. All submissions are stored in the review queue before they become public records."}
          </p>
          <ul style={{ paddingLeft: "18px", margin: "6px 0", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>{lang === "th" ? "ข้อมูลและบันทึกข้อความถูกใช้เป็นแหล่งข้อมูลสำหรับผู้ดูแลระบบ" : "Submitted URLs and notes are sources for reviewer decisions."}</li>
            <li>{lang === "th" ? "การเรียกใช้งานการดึงข้อมูลจะวิเคราะห์แหล่งข้อมูลภายนอกแยกส่วนกัน" : "Data pull jobs can classify external source records separately."}</li>
            <li>{lang === "th" ? "ผู้ดูแลระบบจะอนุมัติ ปฏิเสธ หรือขอข้อมูลเพิ่มเติมก่อนการจัดทำดัชนี" : "Administrators approve, reject, or request more information before indexing submissions."}</li>
          </ul>
        </aside>
      </div>

      {/* Submission Tracking Section */}
      <h2 style={{ marginTop: "24px" }}>{lang === "th" ? "สถานะการประมวลผลและการอนุมัติข้อมูล" : "Signal Tracking & Statuses"}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{lang === "th" ? "หัวข้อ / อ้างอิง" : "Title / Reference"}</th>
              <th>{localT.typeCol}</th>
              <th>{lang === "th" ? "ผู้ส่งข้อมูล" : "Submitter"}</th>
              <th>{localT.statusCol}</th>
              <th>{lang === "th" ? "หมายเหตุและแหล่งข้อมูล" : "Notes & Sources"}</th>
              <th>{lang === "th" ? "วันที่ส่ง" : "Date"}</th>
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
