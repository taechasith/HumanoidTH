import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { loginAsUser, logoutUser, registerAndLoginUser } from "@/app/actions";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const currentEmail = cookieStore.get("user_email")?.value;
  const currentRole = cookieStore.get("user_role")?.value;
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  } catch (error) {
    console.error("Failed to query users in profile page:", error);
  }

  return (
    <>
      <h1>{t.profileTitle}</h1>
      <p className="muted" style={{ marginBottom: "18px" }}>{t.profileDesc}</p>
      
      {currentEmail ? (
        <section className="panel" style={{ border: "1px solid var(--accent)", marginBottom: "20px" }}>
          <h2>Current Session Status</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "10px 0" }}>
            <div><strong>Logged in as:</strong> <code>{currentEmail}</code></div>
            <div><strong>Role:</strong> <span className={`badge ${currentRole === "ADMIN" ? "ok" : ""}`}>{currentRole}</span></div>
          </div>
          
          <form action={logoutUser} style={{ marginTop: "14px" }}>
            <button className="primary" style={{ background: "var(--danger)", borderColor: "var(--danger)" }}>
              Logout
            </button>
          </form>
        </section>
      ) : (
        <section className="panel" style={{ border: "1px solid var(--warning)", marginBottom: "20px" }}>
          <h2>Authentication & Registration</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Register a new account or log in with an existing email. This session will be saved in the PostgreSQL database.
          </p>

          <form action={registerAndLoginUser} className="form" style={{ maxWidth: "400px", gap: "12px" }}>
            <label>
              Email Address
              <input name="email" type="email" required placeholder="name@domain.com" />
            </label>
            <label>
              Full Name (Optional)
              <input name="name" placeholder="John Doe" />
            </label>
            <label>
              Role
              <select name="role" defaultValue="USER">
                <option value="USER">User (Read-only)</option>
                <option value="RESEARCHER">Researcher</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </label>
            <button type="submit" className="primary" style={{ marginTop: "6px" }}>
              Log In / Register
            </button>
          </form>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "14px" }}>
            <span className="muted" style={{ fontSize: "12px" }}>Quick Simulators:</span>
            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
              <form action={loginAsUser.bind(null, "creativelab.co.th@gmail.com", "ADMIN")}>
                <button type="submit" className="button" style={{ fontSize: "11px", minHeight: "28px" }}>
                  Login as Administrator
                </button>
              </form>
              <form action={loginAsUser.bind(null, "researcher@example.com", "RESEARCHER")}>
                <button type="submit" className="button" style={{ fontSize: "11px", minHeight: "28px" }}>
                  🔬 Quick Researcher
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      <h2>Corpus Users List ({users.length})</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registered At</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name || "N/A"}</td>
                <td><code>{user.email}</code></td>
                <td>
                  <span className={`badge ${user.role === "ADMIN" ? "ok" : ""}`}>{user.role}</span>
                </td>
                <td>{user.createdAt.toLocaleString()}</td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td className="empty" colSpan={4}>No users registered in database.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

