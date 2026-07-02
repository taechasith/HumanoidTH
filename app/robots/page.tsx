import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function RobotsPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const robots = await prisma.robotModel.findMany({ orderBy: { canonicalName: "asc" }, take: 200 });

  return (
    <>
      <h1>{t.robotsTitle}</h1>
      <p className="muted" style={{ marginBottom: "18px" }}>{t.robotsDesc}</p>
      <div className="cards">
        {robots.map((robot) => (
          <article className="card" key={robot.id}>
            <h2>{robot.canonicalName}</h2>
            <p className="muted">{robot.description ?? "No description yet."}</p>
            <p><span className="badge">{robot.robotType}</span> <span className="badge">{robot.thailandStatus}</span></p>
            <p><strong>{robot.manufacturer ?? robot.developerOrg ?? "Unknown developer"}</strong><br />{robot.primaryUseCase ?? "Use case unclassified"}</p>
            {robot.officialUrl && <a href={robot.officialUrl}>Source evidence</a>}
          </article>
        ))}
        {!robots.length && <div className="empty">No robot models yet. Add seeds with `pnpm db:seed` or import sources.</div>}
      </div>
    </>
  );
}

