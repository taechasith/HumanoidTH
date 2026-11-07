import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ArrowUpRight, Bot, Database, Search } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ q: rawQuery }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const lang = (cookieStore.get("lang")?.value || "en") as "en" | "th";
  const th = lang === "th";
  const query = (rawQuery || "").trim().slice(0, 120);
  let robots: Awaited<ReturnType<typeof prisma.robotModel.findMany>> = [];
  let sources: Array<{ id: string; title: string; excerpt: string; url: string; platform: string | null; publishedAt: Date | null; relevanceStatus: string }> = [];
  let unavailable = false;

  if (query.length >= 2) {
    try {
      [robots, sources] = await Promise.all([
        prisma.robotModel.findMany({
          where: { OR: [
            { canonicalName: { contains: query, mode: "insensitive" } },
            { manufacturer: { contains: query, mode: "insensitive" } },
            { developerOrg: { contains: query, mode: "insensitive" } },
            { primaryUseCase: { contains: query, mode: "insensitive" } },
          ] },
          orderBy: { canonicalName: "asc" }, take: 12,
        }),
        prisma.sourceRecord.findMany({
          where: { OR: [
            { title: { contains: query, mode: "insensitive" } },
            { excerpt: { contains: query, mode: "insensitive" } },
            { author: { contains: query, mode: "insensitive" } },
          ] },
          orderBy: [{ relevanceConfidence: "desc" }, { updatedAt: "desc" }], take: 16,
          select: { id: true, title: true, excerpt: true, url: true, platform: true, publishedAt: true, relevanceStatus: true },
        }),
      ]);
    } catch (error) {
      console.error("Global search failed:", error);
      unavailable = true;
    }
  }

  return <div className="search-page">
    <header className="search-page__header">
      <span className="search-page__eyebrow"><Search size={14} />{th ? "ค้นหาทั่วทั้ง Atlas" : "ATLAS SEARCH"}</span>
      <h1>{query ? <>{th ? "ผลการค้นหาสำหรับ " : "Search results for "}<em>“{query}”</em></> : th ? "ค้นหาหุ่นยนต์และงานวิจัย" : "Search robots & research"}</h1>
      <p>{th ? "ค้นหา Robot models, หลักฐาน และงานวิจัยที่เชื่อมโยงกับระบบนิเวศหุ่นยนต์ไทย" : "Explore robot models, linked evidence, and research across Thailand’s robotics ecosystem."}</p>
    </header>
    {!query ? <div className="search-empty"><Search size={22} /><strong>{th ? "พิมพ์คำค้นหาเพื่อเริ่มต้น" : "Start with a search"}</strong><span>{th ? "ลองค้นด้วยชื่อหุ่นยนต์ ผู้พัฒนา หรือหัวข้องานวิจัย" : "Try a robot name, developer, source, or research topic."}</span></div> : unavailable ? <div className="search-empty"><strong>{th ? "ยังค้นฐานข้อมูลไม่ได้" : "Search is temporarily unavailable"}</strong><span>{th ? "เชื่อมต่อฐานข้อมูลอีกครั้งแล้วลองใหม่" : "Reconnect to the database and try again."}</span></div> : <>
      <div className="search-page__counts"><span>{robots.length} {th ? "Robot models" : `robot ${robots.length === 1 ? "model" : "models"}`}</span><span>{sources.length} {th ? "แหล่งข้อมูล" : `research ${sources.length === 1 ? "source" : "sources"}`}</span></div>
      <section className="search-results" aria-labelledby="robot-results-heading">
        <div className="search-results__heading"><Bot size={17} /><h2 id="robot-results-heading">{th ? "Robot models" : "Robot models"}</h2><span>{robots.length}</span><Link href={`/robots?q=${encodeURIComponent(query)}`}>{th ? "ดูทะเบียนทั้งหมด" : "Browse registry"}<ArrowUpRight size={14} /></Link></div>
        {robots.length ? <div className="search-robot-grid">{robots.map((robot) => <Link className="search-robot-card" href={`/robots/${robot.id}`} key={robot.id}>
          <span className="search-robot-card__icon"><Bot size={19} /></span><span className="search-robot-card__body"><strong>{robot.canonicalName}</strong><small>{robot.manufacturer || robot.developerOrg || (th ? "ยังไม่ระบุผู้พัฒนา" : "Developer not specified")}</small></span><ArrowUpRight size={15} />
          <span className="search-robot-card__meta">{robot.robotType.replace(/[_-]/g, " ")} <i /> {robot.thailandStatus.replace(/[_-]/g, " ")}</span>
        </Link>)}</div> : <p className="search-no-results">{th ? "ไม่พบ Robot model ที่ตรงกัน" : "No matching robot models."}</p>}
      </section>
      <section className="search-results" aria-labelledby="source-results-heading">
        <div className="search-results__heading"><Database size={17} /><h2 id="source-results-heading">{th ? "หลักฐานและงานวิจัย" : "Evidence & research"}</h2><span>{sources.length}</span></div>
        {sources.length ? <div className="search-source-list">{sources.map((source) => <a className="search-source-row" href={source.url} key={source.id} rel="noopener noreferrer" target="_blank">
          <span className="search-source-row__icon"><Database size={16} /></span><span className="search-source-row__body"><strong>{source.title}</strong><small>{[source.platform, source.publishedAt ? new Intl.DateTimeFormat(th ? "th-TH" : "en", { year: "numeric", month: "short" }).format(source.publishedAt) : null, source.relevanceStatus.toLowerCase().replace(/_/g, " ")].filter(Boolean).join(" · ")}</small>{source.excerpt && <span>{source.excerpt}</span>}</span><ArrowUpRight size={15} />
        </a>)}</div> : <p className="search-no-results">{th ? "ไม่พบแหล่งข้อมูลที่ตรงกัน" : "No matching evidence or research."}</p>}
      </section>
    </>}
  </div>;
}
