import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getTranslation } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function PerspectivesPage() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const t = getTranslation(lang);

  const items = await prisma.perspectiveAnnotation.findMany({
    include: { source: true },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <>
      <h1>{t.perspectivesTitle}</h1>
      <p className="muted">{t.perspectivesDesc}</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Source</th><th>Theme</th><th>Stance</th><th>Sentiment</th><th>Confidence</th><th>Evidence</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><a href={item.source.url}>{item.source.title}</a><br /><span className="muted">{item.source.platform}</span></td>
                <td>{item.perspectiveTheme}</td>
                <td>{item.stance}</td>
                <td>{item.sentiment}</td>
                <td><span className={item.confidence < 0.6 ? "badge warn" : "badge ok"}>{item.confidence.toFixed(2)}</span></td>
                <td>{item.evidenceExcerpt}</td>
              </tr>
            ))}
            {!items.length && <tr><td className="empty" colSpan={6}>No perspective annotations yet. Run an API pull with accepted records.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

