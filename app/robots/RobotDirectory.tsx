"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Clock3, Database, Flame, MapPin, Search, SlidersHorizontal } from "lucide-react";
import styles from "./RobotDirectory.module.css";

export type RobotDirectoryItem = {
  id: string;
  canonicalName: string;
  description: string | null;
  robotType: string;
  thailandStatus: string;
  manufacturer: string | null;
  developerOrg: string | null;
  primaryUseCase: string | null;
  officialUrl: string | null;
  bannerUrl: string | null;
  publicLocations: string[];
  contributionCount: number;
  updatedAt: string;
  firstSeenYear: number | null;
};

type Props = {
  lang: "en" | "th";
  robots: RobotDirectoryItem[];
  initialQuery?: string;
};

type View = "location" | "latest" | "popular";

const localT = {
  en: {
    location: "By location",
    latest: "Latest in Atlas",
    popular: "Popular in Atlas",
    locationHint: "See which public places have recorded each model.",
    latestHint: "Recently added or updated registry records.",
    popularHint: "Ranked by public deployments and linked records — not page views.",
    search: "Search robot models…",
    clear: "Clear search",
    publicPlace: "Public location",
    undisclosed: "Public location not disclosed",
    undisclosedHint: "No public inventory location is connected to this model yet.",
    models: "models",
    model: "model",
    recordedHere: "recorded here",
    publicSites: "public sites",
    linkedRecords: "linked records",
    activity: "Atlas activity",
    updated: "Updated",
    firstSeen: "First recorded",
    noMatches: "No models match this search.",
    filters: "Filters",
    allTypes: "All robot types",
    allStatuses: "All Thailand statuses",
    sortBy: "Sort by",
    sortName: "Name A–Z",
    sortUpdated: "Recently updated",
    sortActivity: "Atlas activity",
    results: "models",
    source: "Open source",
    noImage: "No source image",
    locationSummary: "Models are grouped by their public deployment locations. A model can appear in more than one location.",
    latestSummary: "Newest registry updates, so you can see what has recently changed in the Atlas.",
    popularSummary: "More public deployments and linked evidence place a model higher in this list."
  },
  th: {
    location: "ตามพื้นที่",
    latest: "ล่าสุดใน Atlas",
    popular: "นิยมใน Atlas",
    locationHint: "ดูว่ามีรุ่นใดถูกบันทึกไว้ในพื้นที่สาธารณะใดบ้าง",
    latestHint: "รายการโมเดลที่เพิ่งเพิ่มหรืออัปเดตในทะเบียน",
    popularHint: "จัดอันดับจาก deployment สาธารณะและ records ที่เชื่อมโยง ไม่ใช่ยอดวิว",
    search: "ค้นหา Robot Model…",
    clear: "ล้างคำค้นหา",
    publicPlace: "พื้นที่สาธารณะ",
    undisclosed: "ยังไม่ระบุพื้นที่สาธารณะ",
    undisclosedHint: "โมเดลนี้ยังไม่มี inventory ที่เปิดเผยสถานที่เชื่อมโยงอยู่",
    models: "รุ่น",
    model: "รุ่น",
    recordedHere: "ที่บันทึกในพื้นที่นี้",
    publicSites: "พื้นที่สาธารณะ",
    linkedRecords: "records ที่เชื่อมโยง",
    activity: "สัญญาณกิจกรรมใน Atlas",
    updated: "อัปเดต",
    firstSeen: "พบใน Atlas ครั้งแรก",
    noMatches: "ไม่พบ Robot Model ที่ตรงกับคำค้นหา",
    filters: "ตัวกรอง",
    allTypes: "ทุกประเภทหุ่นยนต์",
    allStatuses: "ทุกสถานะในไทย",
    sortBy: "เรียงตาม",
    sortName: "ชื่อ A–Z",
    sortUpdated: "อัปเดตล่าสุด",
    sortActivity: "กิจกรรมใน Atlas",
    results: "รุ่น",
    source: "เปิดแหล่งข้อมูล",
    noImage: "ไม่มีรูปจากแหล่งข้อมูล",
    locationSummary: "จัดกลุ่มตามสถานที่ deployment ที่เปิดเผยต่อสาธารณะ โมเดลหนึ่งรุ่นจึงอาจปรากฏได้มากกว่าหนึ่งพื้นที่",
    latestSummary: "รายการที่เพิ่งเปลี่ยนแปลงในทะเบียน เพื่อดูข้อมูลใหม่ใน Atlas ได้รวดเร็ว",
    popularSummary: "ยิ่งมี deployment สาธารณะและหลักฐานที่เชื่อมโยงมาก จะอยู่ลำดับสูงขึ้น"
  }
};

function cleanLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function activityScore(robot: RobotDirectoryItem) {
  return robot.publicLocations.length * 2 + robot.contributionCount;
}

function dateLabel(value: string, lang: Props["lang"]) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(lang === "th" ? "th-TH" : "en", { month: "short", year: "numeric" }).format(date);
}

function RobotCard({ robot, lang }: { robot: RobotDirectoryItem; lang: Props["lang"] }) {
  const t = localT[lang];
  return (
    <article className={styles.robotCard}>
      <div className={styles.cardImage}>
        {robot.bannerUrl ? <img alt={robot.canonicalName} loading="lazy" src={robot.bannerUrl} /> : <div className={styles.imageFallback}><Bot aria-hidden="true" size={22} /><span>{t.noImage}</span></div>}
        <span className={styles.typeBadge}>{cleanLabel(robot.robotType)}</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardTitleRow}>
          <h3><Link href={`/robots/${robot.id}`}>{robot.canonicalName}</Link></h3>
          <span className={styles.statusBadge}>{cleanLabel(robot.thailandStatus)}</span>
        </div>
        <p className={styles.description}>{robot.description ?? (lang === "th" ? "ยังไม่มีคำอธิบายโมเดล" : "No description yet.")}</p>
        <p className={styles.developer}>{robot.manufacturer ?? robot.developerOrg ?? (lang === "th" ? "ยังไม่ระบุผู้พัฒนา" : "Developer not specified")}</p>
        <div className={styles.locationChips} aria-label={t.publicPlace}>
          {robot.publicLocations.length ? robot.publicLocations.map((location) => <span key={location}><MapPin aria-hidden="true" size={12} />{location}</span>) : <span className={styles.undisclosed}><MapPin aria-hidden="true" size={12} />{t.undisclosed}</span>}
        </div>
        <div className={styles.cardFooter}>
          <span><Database aria-hidden="true" size={13} />{robot.contributionCount} {t.linkedRecords}</span>
          {robot.officialUrl ? <a href={robot.officialUrl} rel="noopener noreferrer" target="_blank">{t.source}</a> : null}
        </div>
      </div>
    </article>
  );
}

function LocationGroup({ label, robots, lang }: { label: string; robots: RobotDirectoryItem[]; lang: Props["lang"] }) {
  const t = localT[lang];
  const undisclosed = label === "__undisclosed__";
  const title = undisclosed ? t.undisclosed : label;
  return (
    <section className={styles.locationGroup}>
      <header className={styles.groupHeader}>
        <div>
          <span className={styles.groupEyebrow}>{undisclosed ? t.publicPlace : t.recordedHere}</span>
          <h2><MapPin aria-hidden="true" size={18} />{title}</h2>
          {undisclosed ? <p>{t.undisclosedHint}</p> : null}
        </div>
        <strong>{robots.length} <small>{robots.length === 1 ? t.model : t.models}</small></strong>
      </header>
      <div className={styles.robotGrid}>{robots.map((robot) => <RobotCard key={robot.id} lang={lang} robot={robot} />)}</div>
    </section>
  );
}

export default function RobotDirectory({ lang, robots, initialQuery = "" }: Props) {
  const t = localT[lang];
  const [view, setView] = useState<View>("location");
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "updated" | "activity">("updated");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const robotTypes = useMemo(() => [...new Set(robots.map((robot) => robot.robotType))].sort(), [robots]);
  const statuses = useMemo(() => [...new Set(robots.map((robot) => robot.thailandStatus))].sort(), [robots]);
  const visibleRobots = useMemo(() => {
    return robots.filter((robot) => (typeFilter === "all" || robot.robotType === typeFilter)
      && (statusFilter === "all" || robot.thailandStatus === statusFilter)
      && (!normalizedQuery || [
      robot.canonicalName,
      robot.robotType,
      robot.manufacturer,
      robot.developerOrg,
      robot.primaryUseCase,
      ...robot.publicLocations
    ].filter(Boolean).join(" ").toLocaleLowerCase().includes(normalizedQuery)));
  }, [normalizedQuery, robots, statusFilter, typeFilter]);
  const locationGroups = useMemo(() => {
    const grouped = new Map<string, RobotDirectoryItem[]>();
    visibleRobots.forEach((robot) => {
      const locations = robot.publicLocations.length ? robot.publicLocations : ["__undisclosed__"];
      locations.forEach((location) => grouped.set(location, [...(grouped.get(location) ?? []), robot]));
    });
    return [...grouped.entries()].sort(([leftName, left], [rightName, right]) => {
      if (leftName === "__undisclosed__") return 1;
      if (rightName === "__undisclosed__") return -1;
      return right.length - left.length || leftName.localeCompare(rightName);
    });
  }, [visibleRobots]);
  const orderedRobots = useMemo(() => [...visibleRobots].sort((left, right) => {
    if (sortBy === "name") return left.canonicalName.localeCompare(right.canonicalName);
    if (sortBy === "activity") return activityScore(right) - activityScore(left) || new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  }), [sortBy, visibleRobots]);
  const sortedLocationGroups = useMemo(() => locationGroups.map(([location, models]) => [location, [...models].sort((left, right) => {
    if (sortBy === "name") return left.canonicalName.localeCompare(right.canonicalName);
    if (sortBy === "activity") return activityScore(right) - activityScore(left) || left.canonicalName.localeCompare(right.canonicalName);
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  })] as [string, RobotDirectoryItem[]]), [locationGroups, sortBy]);
  const viewCopy = view === "location" ? t.locationSummary : view === "latest" ? t.latestSummary : t.popularSummary;

  return (
    <section className={styles.directory} aria-label={lang === "th" ? "วิธีดู Robot Model" : "Robot model views"}>
      <div className={styles.controlBar}>
        <div className={styles.viewTabs} aria-label={lang === "th" ? "รูปแบบการจัดกลุ่ม Robot Model" : "Robot model grouping"} role="tablist">
          {([
            ["location", MapPin, t.location, t.locationHint],
            ["latest", Clock3, t.latest, t.latestHint],
            ["popular", Flame, t.popular, t.popularHint]
          ] as const).map(([id, Icon, label, hint]) => (
            <button aria-selected={view === id} className={view === id ? styles.activeTab : ""} key={id} onClick={() => { setView(id); if (id === "latest") setSortBy("updated"); if (id === "popular") setSortBy("activity"); }} role="tab" type="button">
              <Icon aria-hidden="true" size={17} />
              <span><strong>{label}</strong><small>{hint}</small></span>
            </button>
          ))}
        </div>
        <label className={styles.searchBox}>
          <Search aria-hidden="true" size={16} />
          <input aria-label={t.search} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} value={query} />
          {query ? <button aria-label={t.clear} onClick={() => setQuery("")} type="button">×</button> : null}
        </label>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterLabel}><SlidersHorizontal size={15} /><span>{t.filters}</span><b>{visibleRobots.length} {t.results}</b></div>
        <label><span>{t.filters}</span><select aria-label={t.allTypes} onChange={(event) => setTypeFilter(event.target.value)} value={typeFilter}><option value="all">{t.allTypes}</option>{robotTypes.map((type) => <option key={type} value={type}>{cleanLabel(type)}</option>)}</select></label>
        <label><span>{lang === "th" ? "สถานะ" : "Thailand status"}</span><select aria-label={t.allStatuses} onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">{t.allStatuses}</option>{statuses.map((status) => <option key={status} value={status}>{cleanLabel(status)}</option>)}</select></label>
        <label><span>{t.sortBy}</span><select aria-label={t.sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} value={sortBy}><option value="name">{t.sortName}</option><option value="updated">{t.sortUpdated}</option><option value="activity">{t.sortActivity}</option></select></label>
      </div>

      {visibleRobots.length ? (
        view === "location" ? (
          <div className={styles.locationView}>
            <p className={styles.viewSummary}>{viewCopy}</p>
            {sortedLocationGroups.map(([location, groupedRobots]) => <LocationGroup key={location} label={location} lang={lang} robots={groupedRobots} />)}
          </div>
        ) : (
          <div className={styles.orderedView}>
            <header className={styles.orderedHeader}>
              <div>
                <span className={styles.groupEyebrow}>{view === "latest" ? t.latest : t.activity}</span>
                <h2>{view === "latest" ? t.latest : t.popular}</h2>
                <p>{viewCopy}</p>
              </div>
              <strong>{orderedRobots.length} <small>{orderedRobots.length === 1 ? t.model : t.models}</small></strong>
            </header>
            <div className={styles.robotGrid}>
              {orderedRobots.map((robot, index) => (
                <div className={styles.rankedCard} key={robot.id}>
                  <span className={styles.rank}>{view === "latest" ? <><Clock3 aria-hidden="true" size={14} />{dateLabel(robot.updatedAt, lang)}</> : <><Flame aria-hidden="true" size={14} />{activityScore(robot)} {t.activity}</>}</span>
                  <RobotCard lang={lang} robot={robot} />
                </div>
              ))}
            </div>
          </div>
        )
      ) : <div className={styles.noMatches}>{t.noMatches}</div>}
    </section>
  );
}
