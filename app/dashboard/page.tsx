import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "./DashboardCharts";
import { Bot, Database, FileText, Globe2, MessageSquareText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ecosystem Dashboard", description: "A clear, high-level view of Thailand's humanoid robotics ecosystem.", alternates: { canonical: "/dashboard" } };

type Group = { _count: { _all: number }; [key: string]: unknown };
const label = (value: unknown) => String(value || "Unknown").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const toData = (groups: Group[], key: string, limit = 7) => groups.sort((a, b) => b._count._all - a._count._all).slice(0, limit).map((item) => ({ label: label(item[key]), value: item._count._all }));
function categoryForRobot(value: string | null) {
  const text = (value || "").toLowerCase();
  if (text.includes("education")) return "Education";
  if (text.includes("medical") || text.includes("health")) return "Medical";
  if (text.includes("assist") || text.includes("rehab")) return "Assistive";
  if (text.includes("security")) return "Security";
  if (text.includes("humanoid")) return "Humanoid";
  if (text.includes("service") || text.includes("social") || text.includes("telepresence")) return "Service";
  return "Other";
}

export default async function DashboardPage() {
  let offline = false;
  let kpis = { robots: 0, sources: 0, contributions: 0, perspectives: 0, countries: 0 };
  let composition: Array<{ label: string; value: number }> = [], sourceTypes: Array<{ label: string; value: number }> = [], origins: Array<{ label: string; value: number }> = [], contributionTypes: Array<{ label: string; value: number }> = [], embodiment: Array<{ label: string; value: number }> = [], themes: Array<{ label: string; value: number }> = [];
  let perspectiveConfidence = { high: 0, moderate: 0, low: 0 }, sourceConfidence = { high: 0, moderate: 0, low: 0 };

  try {
    const [robots, sources, contributions, perspectives, originsRaw, typesRaw, sourceTypesRaw, embodimentRaw, contributionRaw, themesRaw, pHigh, pModerate, pLow, sHigh, sModerate, sLow] = await Promise.all([
      prisma.robotModel.findMany({ select: { robotType: true } }), prisma.sourceRecord.count(), prisma.contribution.count(), prisma.perspectiveAnnotation.count(), prisma.robotModel.groupBy({ by: ["countryOfOrigin"], _count: { _all: true } }), prisma.robotModel.groupBy({ by: ["robotType"], _count: { _all: true } }), prisma.sourceRecord.groupBy({ by: ["sourceType"], _count: { _all: true } }), prisma.robotModel.groupBy({ by: ["embodimentLevel"], _count: { _all: true } }), prisma.contribution.groupBy({ by: ["contributionType"], _count: { _all: true } }), prisma.perspectiveAnnotation.groupBy({ by: ["perspectiveTheme"], _count: { _all: true } }), prisma.perspectiveAnnotation.count({ where: { confidence: { gte: .8 } } }), prisma.perspectiveAnnotation.count({ where: { confidence: { gte: .5, lt: .8 } } }), prisma.perspectiveAnnotation.count({ where: { confidence: { lt: .5 } } }), prisma.sourceRecord.count({ where: { relevanceConfidence: { gte: .8 } } }), prisma.sourceRecord.count({ where: { relevanceConfidence: { gte: .5, lt: .8 } } }), prisma.sourceRecord.count({ where: { relevanceConfidence: { lt: .5 } } })
    ]);
    const grouped = robots.reduce<Record<string, number>>((result, robot) => { const key = categoryForRobot(robot.robotType); result[key] = (result[key] || 0) + 1; return result; }, {});
    composition = Object.entries(grouped).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    sourceTypes = toData(sourceTypesRaw, "sourceType", 5); origins = toData(originsRaw, "countryOfOrigin", 6); contributionTypes = toData(contributionRaw, "contributionType", 6); embodiment = toData(embodimentRaw, "embodimentLevel", 6); themes = toData(themesRaw, "perspectiveTheme", 6);
    kpis = { robots: robots.length, sources, contributions, perspectives, countries: originsRaw.filter((item) => item.countryOfOrigin).length };
    perspectiveConfidence = { high: pHigh, moderate: pModerate, low: pLow }; sourceConfidence = { high: sHigh, moderate: sModerate, low: sLow };
  } catch { offline = true; }

  const cards = [{ label: "Robots", value: kpis.robots, icon: Bot }, { label: "Sources", value: kpis.sources, icon: Database }, { label: "Contributions", value: kpis.contributions, icon: FileText }, { label: "Perspectives", value: kpis.perspectives, icon: MessageSquareText }, { label: "Countries", value: kpis.countries, icon: Globe2 }];
  return <div className="dashboard-page"><header className="page-header"><div><span className="eyebrow">Ecosystem overview</span><h1>Thailand robotics, at a glance.</h1><p>Grouped, live indicators across models, evidence, contributions, and public perspectives.</p></div><span className={`data-mode${offline ? " data-mode--offline" : ""}`}>{offline ? "Database offline" : "Live data"}</span></header>
    {offline ? <div className="state-banner state-banner--warning"><strong>Live database unavailable.</strong> This dashboard intentionally does not show fallback demo figures.</div> : <><section className="dashboard-kpis">{cards.map(({ label, value, icon: Icon }) => <article className="dashboard-kpi" key={label}><span><Icon size={21} /></span><div><small>{label}</small><strong>{value.toLocaleString()}</strong></div></article>)}</section><DashboardCharts composition={composition} sourceTypes={sourceTypes} origins={origins} contributionTypes={contributionTypes} embodimentLevels={embodiment} themes={themes} perspectiveConfidence={perspectiveConfidence} sourceConfidence={sourceConfidence} /></>}
  </div>;
}
