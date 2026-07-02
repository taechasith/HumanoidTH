import { runDataPull } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function DataPullsPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const jobs = await prisma.sourcePullJob.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <>
      <h1>{t.dataPullsTitle}</h1>
      <p className="muted">{t.dataPullsDesc}</p>

      <form className="form panel" action={runDataPull}>
        <label>Adapter
          <select name="adapter">
            <option value="OPENALEX">OpenAlex</option>
            <option value="GITHUB">GitHub</option>
            <option value="GDELT">GDELT</option>
            <option value="YOUTUBE">YouTube</option>
          </select>
        </label>
        <label>Query<input name="query" defaultValue="humanoid robot Thailand" required /></label>
        <label>Limit<input name="limit" type="number" min="1" max="50" defaultValue="10" /></label>
        <button className="primary" type="submit">Run pull</button>
      </form>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table>
          <thead><tr><th>Adapter</th><th>Query</th><th>Status</th><th>Found</th><th>Saved</th><th>Error / missing key</th></tr></thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.adapter}</td>
                <td>{job.query}</td>
                <td>{job.status}</td>
                <td>{job.recordsFound}</td>
                <td>{job.recordsSaved}</td>
                <td>{job.errorMessage}</td>
              </tr>
            ))}
            {!jobs.length && <tr><td className="empty" colSpan={6}>No jobs yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

