import Link from "next/link";
import { ArrowRight, Award, Database, ShieldCheck } from "lucide-react";

export type LeaderboardRobot = {
  id: string;
  name: string;
  developer: string | null;
  robotType: string;
  contributions: number;
  publicDeployments: number;
  score: number;
  confidence: number;
};

const avatarText = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function ModelAvatar({ name, rank, compact = false }: { name: string; rank: number; compact?: boolean }) {
  return <span className={`leaderboard-avatar leaderboard-avatar--${rank}${compact ? " leaderboard-avatar--compact" : ""}`} aria-hidden="true">{avatarText(name)}{!compact && <i><Award size={13} /></i>}</span>;
}

function Confidence({ value }: { value: number }) {
  return <span className="leaderboard-confidence"><ShieldCheck size={16} aria-hidden="true" /><b>{value}% confidence</b></span>;
}

export default function RobotLeaderboard({ robots }: { robots: LeaderboardRobot[] }) {
  const podium = [robots[1], robots[0], robots[2]].filter((robot): robot is LeaderboardRobot => Boolean(robot));
  const remaining = robots.slice(3);

  return <section className="robot-leaderboard" id="leaderboard" aria-labelledby="leaderboard-title">
    <div className="leaderboard-panel">
      <header className="robot-leaderboard__header">
        <div><span className="eyebrow">Atlas leaderboard</span><h2 id="leaderboard-title">Highest-confidence robot models</h2><p>Ranked by the confidence of each model&apos;s verified Atlas status.</p></div>
        <Link href="/robots" className="robot-leaderboard__all">View full leaderboard <ArrowRight size={17} aria-hidden="true" /></Link>
      </header>
      {robots.length ? <>
      <div className="leaderboard-podium" aria-label="Top three robot models">
        {podium.map((robot) => { const rank = robots.indexOf(robot) + 1; return <Link href={`/robots/${robot.id}`} className={`leaderboard-podium__card leaderboard-podium__card--${rank}`} key={robot.id}>
          <ModelAvatar name={robot.name} rank={rank} />
          <strong>{robot.name}</strong>
          <Confidence value={robot.confidence} />
        </Link>; })}
      </div>
      {remaining.length ? <div className="leaderboard-list" role="list" aria-label="Additional ranked robot models">
        {remaining.map((robot, index) => { const rank = index + 4; return <Link href={`/robots/${robot.id}`} className="leaderboard-list__row" key={robot.id} role="listitem">
          <span className="leaderboard-list__rank">{rank}</span><ModelAvatar name={robot.name} rank={rank} compact /><span className="leaderboard-list__model"><strong>{robot.name}</strong></span><span className="leaderboard-list__records"><Database size={15} aria-hidden="true" />{robot.contributions} records</span><Confidence value={robot.confidence} />
        </Link>; })}
      </div> : null}
      </> : <div className="robot-leaderboard__empty">No model activity has been recorded yet. Add a public robot record to begin the ranking.</div>}
    </div>
  </section>;
}
