"use client";

import Link from "next/link";
import { ArrowRight, FileText, Flame, Sparkles } from "lucide-react";
import { useState } from "react";

export type HighlightSource = {
  id: string;
  title: string;
  excerpt: string;
  platform: string | null;
  author: string | null;
  relevanceConfidence: number;
  updatedAt: string;
};

type Props = { trending: HighlightSource[]; latest: HighlightSource[] };

const truncate = (value: string, limit: number) => value.length > limit ? `${value.slice(0, limit - 1).trimEnd()}…` : value;
const sourceName = (source: HighlightSource) => source.platform || source.author || "Atlas evidence";
const sourceInitial = (source: HighlightSource) => sourceName(source).slice(0, 1).toUpperCase();

export default function AtlasHighlights({ trending, latest }: Props) {
  const [tab, setTab] = useState<"trending" | "latest">("trending");
  const sources = tab === "trending" ? trending : latest;

  return <section className="atlas-highlights" aria-labelledby="atlas-highlights-title">
    <header className="atlas-highlights__header"><div><span className="eyebrow">Public evidence</span><h2 id="atlas-highlights-title">Explore what&apos;s shaping the atlas</h2><p>High-confidence and recently added sources from Thailand&apos;s robotics ecosystem.</p></div><Link href="/database?table=sources" className="atlas-highlights__all">View all <ArrowRight size={17} aria-hidden="true" /></Link></header>
    <div className="atlas-highlights__tabs" role="tablist" aria-label="Evidence highlights">
      <button type="button" role="tab" aria-selected={tab === "trending"} className={tab === "trending" ? "active" : ""} onClick={() => setTab("trending")}><Flame size={16} aria-hidden="true" />Trending</button>
      <button type="button" role="tab" aria-selected={tab === "latest"} className={tab === "latest" ? "active" : ""} onClick={() => setTab("latest")}><Sparkles size={16} aria-hidden="true" />Recently added</button>
    </div>
    {sources.length ? <div className="atlas-highlights__grid" role="tabpanel">
      {sources.map((source, index) => { const score = Math.round(source.relevanceConfidence * 100); return <article className="highlight-card" key={source.id}>
        <div className="highlight-card__content">
          <div className="highlight-card__meta"><span>Evidence {String(index + 1).padStart(2, "0")}</span><strong>{score}% match</strong></div>
          <h3>{truncate(source.title, 96)}</h3>
          <p>{truncate(source.excerpt || "This source has been accepted into the public Atlas evidence collection.", 180)}</p>
          <span className="highlight-card__source"><i>{sourceInitial(source)}</i><span>{truncate(sourceName(source), 42)}</span></span>
        </div>
        <div className="highlight-card__score"><div><span>Evidence confidence</span><strong>{score}%</strong></div><span aria-hidden="true"><i style={{ width: `${score}%` }} /></span></div>
      </article>; })}
    </div> : <div className="atlas-highlights__empty"><FileText size={20} aria-hidden="true" /><span>No accepted sources are available yet.</span><Link href="/submit-data">Submit a public source</Link></div>}
  </section>;
}
