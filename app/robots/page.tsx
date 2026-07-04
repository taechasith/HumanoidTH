import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

function getRobotBannerUrl(name: string, url: string | null): string {
  const n = name.toLowerCase();
  
  if (n.includes("nao")) {
    return "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80";
  }
  if (n.includes("pepper")) {
    return "https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?auto=format&fit=crop&w=600&q=80";
  }
  if (n.includes("dinsaw")) {
    return "https://images.unsplash.com/photo-1546776310-eef45dd6d63c?auto=format&fit=crop&w=600&q=80";
  }
  if (n.includes("unitree") || n.includes("h1") || n.includes("g1") || n.includes("atlas")) {
    return "https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=600&q=80";
  }
  
  if (url) {
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) {
      return "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80";
    }
    if (u.includes("github.com")) {
      return "https://images.unsplash.com/photo-1618401471353-b98aedd07871?auto=format&fit=crop&w=600&q=80";
    }
    if (u.includes("openalex.org") || u.includes("arxiv.org") || u.includes("doi.org")) {
      return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80";
    }
  }
  
  return "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=600&q=80";
}

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
    robots = [];
  }

  return (
    <>
      <h1>{t.robotsTitle}</h1>
      <p className="muted" style={{ marginBottom: "18px" }}>{t.robotsDesc}</p>
      {dbOffline && (
        <div className="notice" style={{ marginBottom: 16 }}>
          Live database records are unavailable. No substitute robot registry records are being shown.
        </div>
      )}
      <div className="cards">
        {robots.map((robot) => {
          const bannerUrl = getRobotBannerUrl(robot.canonicalName, robot.officialUrl);
          return (
            <article className="card" key={robot.id}>
              <div className="card-banner">
                <img src={bannerUrl} alt={robot.canonicalName} loading="lazy" />
              </div>
              <h2>{robot.canonicalName}</h2>
              <p className="muted">{robot.description ?? "No description yet."}</p>
              <p><span className="badge">{robot.robotType}</span> <span className="badge">{robot.thailandStatus}</span></p>
              <p><strong>{robot.manufacturer ?? robot.developerOrg ?? "Unknown developer"}</strong><br />{robot.primaryUseCase ?? "Use case unclassified"}</p>
              {robot.officialUrl && <a href={robot.officialUrl} target="_blank" rel="noopener noreferrer">Source</a>}
            </article>
          );
        })}
        {!robots.length && <div className="empty">No robot models yet. Add seeds with `pnpm db:seed` or import sources.</div>}
      </div>
    </>
  );
}
