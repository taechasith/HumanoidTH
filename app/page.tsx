import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import AtlasHighlights from "./components/AtlasHighlights";
import ResearchDataStack from "./components/ResearchDataStack";
import RobotLeaderboard, { type LeaderboardRobot } from "./components/RobotLeaderboard";
import { CheckCircle2, ClipboardCheck, Database, Inbox, Send } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "HumanoidTH - Thailand Humanoid Research Console", description: "Open data for Thailand's humanoid, social, and service robotics ecosystem.", alternates: { canonical: "/" } };

const humanize = (value: string | null) => (value || "Unknown").replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default async function OverviewPage() {
  const role = (await cookies()).get("user_role")?.value;
  const isAdmin = role === "ADMIN";
  let offline = false;
  let metrics = { sources: 0, accepted: 0, robots: 0, inventory: 0, contributions: 0, review: 0, coverage: "No dated records", run: "No active runs" };
  let trendingSources: Array<{ id: string; title: string; excerpt: string; platform: string | null; author: string | null; relevanceConfidence: number; updatedAt: string }> = [];
  let latestSources: typeof trendingSources = [];
  let leaderboard: LeaderboardRobot[] = [];

  try {
    const [sources, accepted, robots, inventory, contributions, review, range, latestRun, trending, latest, robotCandidates] = await Promise.all([
      prisma.sourceRecord.count(), prisma.sourceRecord.count({ where: { relevanceStatus: "ACCEPTED" } }), prisma.robotModel.count(), prisma.ownedInventory.count(), prisma.contribution.count(), prisma.submittedData.count({ where: { status: { in: ["QUEUED", "NEEDS_REVIEW"] } } }), prisma.sourceRecord.aggregate({ _min: { publishedAt: true }, _max: { publishedAt: true } }), prisma.pipelineRun.findFirst({ orderBy: { startedAt: "desc" } })
      , prisma.sourceRecord.findMany({ where: { relevanceStatus: "ACCEPTED" }, orderBy: [{ relevanceConfidence: "desc" }, { updatedAt: "desc" }], take: 4, select: { id: true, title: true, excerpt: true, platform: true, author: true, relevanceConfidence: true, updatedAt: true } })
      , prisma.sourceRecord.findMany({ where: { relevanceStatus: "ACCEPTED" }, orderBy: { createdAt: "desc" }, take: 4, select: { id: true, title: true, excerpt: true, platform: true, author: true, relevanceConfidence: true, updatedAt: true } })
      , prisma.robotModel.findMany({ take: 100, select: { id: true, canonicalName: true, developerOrg: true, manufacturer: true, robotType: true, statusConfidence: true, inventory: { where: { visibility: "public" }, select: { id: true } }, _count: { select: { contributions: true } } } })
    ]);
    metrics = { sources, accepted, robots, inventory, contributions, review, coverage: range._min.publishedAt && range._max.publishedAt ? `${range._min.publishedAt.getFullYear()} - ${range._max.publishedAt.getFullYear()}` : "No dated records", run: latestRun ? `${humanize(latestRun.status)} - ${latestRun.pipelineName}` : "No active runs" };
    const normalize = (items: typeof trending) => items.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() }));
    trendingSources = normalize(trending);
    latestSources = normalize(latest);
    leaderboard = robotCandidates.map((robot) => ({ id: robot.id, name: robot.canonicalName, developer: robot.manufacturer || robot.developerOrg, robotType: robot.robotType, contributions: robot._count.contributions, publicDeployments: robot.inventory.length, score: robot._count.contributions * 3 + robot.inventory.length * 2 + Math.round(robot.statusConfidence * 10), confidence: Math.round(robot.statusConfidence * 100) })).sort((left, right) => right.confidence - left.confidence || right.score - left.score || right.contributions - left.contributions || left.name.localeCompare(right.name)).slice(0, 6);
  } catch { offline = true; }


  return <div className="overview-page">
    {offline && <div className="state-banner state-banner--warning"><strong>Live database unavailable.</strong> Metrics are not replaced with demo data.</div>}
    <section className="overview-hero">
      <div className="overview-hero__image"><img src="/thailand-robotics-ecosystem.png" alt="Friendly robot exploring Thailand's robotics ecosystem" /></div>
      <div className="overview-copy"><span className="eyebrow">Open data. Brighter robotics for Thailand.</span><h1>Humanoid<span>TH</span></h1><p className="overview-title">Thailand Humanoid Research Console</p><p>A public research atlas for understanding the people, robots, evidence, and projects shaping Thailand&apos;s embodied AI ecosystem.</p><p className="overview-intro">Start with a robot model, follow the supporting sources, or contribute a public record for review.</p><div className="overview-hero__actions"><Link href="/robots">Explore robot models</Link><Link href="/database">Browse evidence</Link></div><div className="overview-status"><CheckCircle2 size={16} aria-hidden="true" />{offline ? "Live connection needs attention" : "Live database connected"}</div></div>
    </section>
    <section className="quick-actions" aria-label="Quick actions"><div className="quick-action-header"><div><span className="eyebrow">Start here</span><h2>Choose your next task</h2><p>Explore the atlas, add evidence, or continue the review workflow from one place.</p></div><span className="role-pill">{isAdmin ? "Admin workspace" : "Public workspace"}</span></div><div className="quick-action-grid"><Action href="/data-pulls" title="Run data pull" description="Fetch and review new public sources." icon={Inbox} restricted={!isAdmin} /><Action href="/database" title="Browse database" description="Explore sources, models, and linked evidence." icon={Database} /><Action href="/submit-data" title="Submit a record" description="Share a model, source, or correction for review." icon={Send} /><Action href="/admin" title={`Review queue${metrics.review ? ` (${metrics.review})` : ""}`} description="Validate incoming community records." icon={ClipboardCheck} restricted={!isAdmin} /></div></section>
    <AtlasHighlights trending={trendingSources} latest={latestSources} />
    <RobotLeaderboard robots={leaderboard} />
    <ResearchDataStack cards={[{ id: "sources", value: metrics.sources, label: "Sources", eyebrow: "Public evidence", description: "Inspect the public sources that support the atlas, from research papers and project pages to reviewed media records.", detail: `${metrics.accepted.toLocaleString()} accepted records`, href: "/database", icon: "database" }, { id: "robots", value: metrics.robots, label: "Robot models", eyebrow: "Robot registry", description: "Explore humanoid, social, and service robots that are developed, researched, or observed in Thailand.", detail: "Registered models", href: "/robots", icon: "bot" }, { id: "inventory", value: metrics.inventory, label: "Owned units", eyebrow: "Physical inventory", description: "Track public-safe records of physical robots, including their condition, custody, and availability.", detail: "Public-safe inventory", href: "/inventory", icon: "box" }, { id: "contributors", value: metrics.contributions, label: "Contributors", eyebrow: "Community work", description: "Find the papers, repositories, and community projects that help map Thailand's robotics ecosystem.", detail: "Repos and papers", href: "/contributions", icon: "users" }]} />
    <section className="overview-detail-grid"><article className="surface-card"><span className="eyebrow">Pipeline status</span><h2>{metrics.run}</h2><p>Ingestion and review activity is tracked separately from public records.</p></article><article className="surface-card"><span className="eyebrow">Temporal coverage</span><h2>{metrics.coverage}</h2><p>Publication dates for available source evidence.</p></article></section>
  </div>;
}

function Action({ href, title, description, icon: Icon, restricted = false }: { href: string; title: string; description: string; icon: typeof Inbox; restricted?: boolean }) {
  return <Link className={`quick-action${restricted ? " quick-action--restricted" : ""}`} href={href}><span><Icon size={20} /></span><div><strong>{title}</strong><p>{description}</p>{restricted && <small>Admin access required</small>}</div></Link>;
}
