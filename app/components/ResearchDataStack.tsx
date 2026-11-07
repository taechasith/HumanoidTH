"use client";

import Link from "next/link";
import { Bot, Box, Database, UsersRound } from "lucide-react";
import { type CSSProperties, useState } from "react";

type Card = {
  id: string;
  value: number;
  label: string;
  eyebrow: string;
  description: string;
  detail: string;
  href: string;
  icon: "database" | "bot" | "box" | "users";
};

const icons = { database: Database, bot: Bot, box: Box, users: UsersRound };

export default function ResearchDataStack({ cards }: { cards: Card[] }) {
  const [activeId, setActiveId] = useState(cards[0]?.id);
  const active = cards.find((card) => card.id === activeId) ?? cards[0];

  if (!active) return null;
  const ActiveIcon = icons[active.icon];

  return <section className="research-data" aria-labelledby="research-data-heading">
    <div className="research-data__intro"><span className="eyebrow">Atlas at a glance</span><h2 id="research-data-heading">Research data, when you need it</h2><p>Hover a card to bring it forward and see what you can explore.</p></div>
    <div className="research-data__layout">
      <div className="research-data__deck" aria-label="Research data categories">
        {cards.map((card, index) => <Link href={card.href} key={card.id} className={`research-data__card${card.id === active.id ? " is-active" : ""}`} style={{ "--card-index": index } as CSSProperties} onMouseEnter={() => setActiveId(card.id)} onFocus={() => setActiveId(card.id)} aria-current={card.id === active.id ? "true" : undefined}>
          <span>{card.value.toLocaleString()}</span><strong>{card.label}</strong><small>{card.detail}</small>
        </Link>)}
      </div>
      <aside className="research-data__detail" aria-live="polite"><span className="research-data__detail-icon"><ActiveIcon size={22} aria-hidden="true" /></span><span className="eyebrow">{active.eyebrow}</span><h3>{active.label}</h3><p>{active.description}</p><Link href={active.href}>Explore {active.label.toLowerCase()} →</Link></aside>
    </div>
  </section>;
}
