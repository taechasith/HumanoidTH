import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function RobotsPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  let robots: Array<{
    id: string;
    canonicalName: string;
    description: string | null;
    robotType: string;
    thailandStatus: string;
    manufacturer: string | null;
    developerOrg: string | null;
    primaryUseCase: string | null;
    officialUrl: string | null;
  }> = [];
  let dbOffline = false;

  try {
    robots = await prisma.robotModel.findMany({ orderBy: { canonicalName: "asc" }, take: 200 });
  } catch (error) {
    console.error("Database query failed in robots page:", error);
    dbOffline = true;
    robots = [
      {
        id: "fallback-dinsaw",
        canonicalName: "Dinsaw Robot",
        description: "Thai eldercare and service robot seed record. Connect Prisma and run seed to replace this fallback.",
        robotType: "eldercare_robot",
        thailandStatus: "developed_in_thailand",
        manufacturer: "CT Asia Robotics",
        developerOrg: "CT Asia Robotics",
        primaryUseCase: "eldercare and hospital assistance",
        officialUrl: null
      },
      {
        id: "fallback-nao",
        canonicalName: "NAO",
        description: "Imported humanoid platform used as a registry example until database records are available.",
        robotType: "humanoid_full_body",
        thailandStatus: "observed_in_thailand",
        manufacturer: "SoftBank Robotics",
        developerOrg: null,
        primaryUseCase: "education and HRI research",
        officialUrl: null
      }
    ];
  }

  return (
    <>
      <h1>{t.robotsTitle}</h1>
      <p className="muted" style={{ marginBottom: "18px" }}>{t.robotsDesc}</p>
      {dbOffline && (
        <div className="notice" style={{ marginBottom: 16 }}>
          Live database records are unavailable. Showing fallback robot registry examples.
        </div>
      )}
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
