"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Filter,
  Link2,
  Search,
  Sparkles,
  Layers3,
  Bot,
  Boxes,
  FlaskConical
} from "lucide-react";
import { getTranslation, type Language } from "@/lib/translations";

type EntityKind = "source" | "robot" | "contribution" | "inventory";

type SourceRow = {
  id: string;
  title: string;
  url: string;
  sourceType: string;
  platform: string | null;
  excerpt: string;
  publishedAt: string | null;
};

type RobotRow = {
  id: string;
  canonicalName: string;
  robotType: string;
  manufacturer: string | null;
  primaryUseCase: string | null;
  description: string | null;
};

type ContributionRow = {
  id: string;
  title: string;
  contributionType: string;
  organization: string | null;
  contributorName: string | null;
  description: string | null;
  relatedRobotModelId: string | null;
};

type InventoryRow = {
  id: string;
  displayName: string;
  ownershipStatus: string;
  ownerOrg: string | null;
  locationLabel: string | null;
  notes: string | null;
  robotModelId: string | null;
};

type TripletRow = {
  id: string;
  subject: string;
  relation: string;
  object: string;
  confidence: number;
  sourceId: string | null;
};

type CountSummary = {
  sources: number;
  robots: number;
  contributions: number;
  inventory: number;
  triplets: number;
};

type Props = {
  currentLang: Language;
  sources: SourceRow[];
  robots: RobotRow[];
  contributions: ContributionRow[];
  inventory: InventoryRow[];
  triplets: TripletRow[];
  counts: CountSummary;
};

type LocalEntity = {
  key: string;
  kind: EntityKind;
  id: string;
  label: string;
  path: string;
  subtitle: string;
  description: string;
  relatedIds: string[];
  normalizedLabel: string;
};

const kindMeta: Record<EntityKind, { label: string; icon: typeof Layers3; folder: string }> = {
  source: { label: "Source", icon: FileText, folder: "sources" },
  robot: { label: "Robot", icon: Bot, folder: "robots" },
  contribution: { label: "Contribution", icon: FlaskConical, folder: "contributions" },
  inventory: { label: "Inventory", icon: Boxes, folder: "inventory" }
};

const joinSegments = (basePath: string, ...parts: string[]) => {
  const base = basePath.trim().replace(/[\\/]+$/, "");
  const pathParts = parts.filter(Boolean).map((part) => part.replace(/^[\\/]+|[\\/]+$/g, ""));
  if (!base) return pathParts.join("/");

  const useBackslash = base.includes("\\") && !base.includes("/");
  const joiner = useBackslash ? "\\" : "/";
  return [base, ...pathParts].join(joiner);
};

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "untitled";

const normalizeKey = (value: string) => value.trim().toLowerCase();

const makeSourcePath = (row: SourceRow, basePath: string) => {
  const folder = slugify(row.platform || row.sourceType || "source");
  return joinSegments(basePath, kindMeta.source.folder, folder, `${slugify(row.title)}.md`);
};

const makePath = (kind: EntityKind, label: string, basePath: string) => {
  return joinSegments(basePath, kindMeta[kind].folder, `${slugify(label)}.md`);
};

const makeRelationPath = (basePath: string, subject: string, relation: string, object: string) =>
  joinSegments(basePath, "relations", `${slugify(subject)}__${slugify(relation)}__${slugify(object)}.md`);

const formatPathList = (paths: string[], format: "newline" | "semicolon") =>
  format === "semicolon" ? paths.join("; ") : paths.join("\n");

export default function LocalGraphPathsClient({
  currentLang,
  sources,
  robots,
  contributions,
  inventory,
  triplets,
  counts
}: Props) {
  const t = getTranslation(currentLang);
  const [basePath, setBasePath] = useState("");
  const [outputFormat, setOutputFormat] = useState<"newline" | "semicolon">("newline");
  const [excludedTerms, setExcludedTerms] = useState("");
  const [includeRelationPaths, setIncludeRelationPaths] = useState(true);
  const [entityKind, setEntityKind] = useState<"all" | EntityKind>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const entities = useMemo(() => {
    const rows: LocalEntity[] = [];

    for (const row of sources) {
      rows.push({
        key: `source:${row.id}`,
        kind: "source",
        id: row.id,
        label: row.title,
        path: makeSourcePath(row, basePath),
        subtitle: [row.platform || row.sourceType, row.publishedAt ? new Date(row.publishedAt).getFullYear() : ""]
          .filter(Boolean)
          .join(" | "),
        description: row.excerpt || row.url,
        relatedIds: [],
        normalizedLabel: normalizeKey(row.title)
      });
    }

    for (const row of robots) {
      rows.push({
        key: `robot:${row.id}`,
        kind: "robot",
        id: row.id,
        label: row.canonicalName,
        path: makePath("robot", row.canonicalName, basePath),
        subtitle: [row.robotType, row.manufacturer || row.primaryUseCase || ""].filter(Boolean).join(" | "),
        description: row.description || row.primaryUseCase || row.manufacturer || "",
        relatedIds: [],
        normalizedLabel: normalizeKey(row.canonicalName)
      });
    }

    for (const row of contributions) {
      rows.push({
        key: `contribution:${row.id}`,
        kind: "contribution",
        id: row.id,
        label: row.title,
        path: makePath("contribution", row.title, basePath),
        subtitle: [row.contributionType, row.organization || row.contributorName || ""].filter(Boolean).join(" | "),
        description: row.description || row.organization || row.contributorName || "",
        relatedIds: row.relatedRobotModelId ? [row.relatedRobotModelId] : [],
        normalizedLabel: normalizeKey(row.title)
      });
    }

    for (const row of inventory) {
      rows.push({
        key: `inventory:${row.id}`,
        kind: "inventory",
        id: row.id,
        label: row.displayName,
        path: makePath("inventory", row.displayName, basePath),
        subtitle: [row.ownershipStatus, row.locationLabel || row.ownerOrg || ""].filter(Boolean).join(" | "),
        description: row.notes || row.locationLabel || row.ownerOrg || "",
        relatedIds: row.robotModelId ? [row.robotModelId] : [],
        normalizedLabel: normalizeKey(row.displayName)
      });
    }

    return rows;
  }, [sources, robots, contributions, inventory, basePath]);

  const entityIndex = useMemo(() => {
    const index = new Map<string, LocalEntity>();
    for (const entity of entities) {
      index.set(entity.key, entity);
    }
    return index;
  }, [entities]);

  const labelIndex = useMemo(() => {
    const index = new Map<string, string[]>();
    for (const entity of entities) {
      const current = index.get(entity.normalizedLabel) || [];
      current.push(entity.key);
      index.set(entity.normalizedLabel, current);
    }
    return index;
  }, [entities]);

  const adjacency = useMemo(() => {
    const graph = new Map<string, Set<string>>();

    const ensure = (key: string) => {
      if (!graph.has(key)) {
        graph.set(key, new Set());
      }
      return graph.get(key)!;
    };

    for (const entity of entities) ensure(entity.key);

    for (const entity of entities) {
      for (const relatedId of entity.relatedIds) {
        const targetKey = entities.find((candidate) => candidate.id === relatedId && candidate.kind === "robot")?.key;
        if (targetKey) {
          ensure(entity.key).add(targetKey);
          ensure(targetKey).add(entity.key);
        }
      }
    }

    for (const triplet of triplets) {
      const subjectKeys = labelIndex.get(normalizeKey(triplet.subject)) || [];
      const objectKeys = labelIndex.get(normalizeKey(triplet.object)) || [];
      const sourceKey = triplet.sourceId ? entities.find((entity) => entity.kind === "source" && entity.id === triplet.sourceId)?.key : undefined;

      for (const subjectKey of subjectKeys) {
        for (const objectKey of objectKeys) {
          if (subjectKey === objectKey) continue;
          ensure(subjectKey).add(objectKey);
          ensure(objectKey).add(subjectKey);
        }
      }

      if (sourceKey) {
        for (const subjectKey of subjectKeys) {
          ensure(sourceKey).add(subjectKey);
          ensure(subjectKey).add(sourceKey);
        }
        for (const objectKey of objectKeys) {
          ensure(sourceKey).add(objectKey);
          ensure(objectKey).add(sourceKey);
        }
      }
    }

    return graph;
  }, [entities, triplets, labelIndex]);

  const filteredEntities = useMemo(() => {
    const terms = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return entities.filter((entity) => {
      if (entityKind !== "all" && entity.kind !== entityKind) return false;
      if (terms.length > 0) {
        const haystack = [entity.label, entity.subtitle, entity.description, entity.path].join(" ").toLowerCase();
        if (!terms.every((term) => haystack.includes(term))) return false;
      }
      return true;
    });
  }, [entities, searchText, entityKind]);

  useEffect(() => {
    if (!filteredEntities.length) {
      setSelectedKey("");
      return;
    }
    if (!filteredEntities.some((entity) => entity.key === selectedKey)) {
      setSelectedKey(filteredEntities[0].key);
    }
  }, [filteredEntities, selectedKey]);

  const selectedEntity = useMemo(
    () => entityIndex.get(selectedKey) || filteredEntities[0] || null,
    [entityIndex, selectedKey, filteredEntities]
  );

  const excludedPatterns = useMemo(
    () =>
      excludedTerms
        .split(",")
        .map((term) => term.trim().toLowerCase())
        .filter(Boolean),
    [excludedTerms]
  );

  const localPaths = useMemo(() => {
    if (!selectedEntity) return [];

    const candidateKeys = new Set<string>([selectedEntity.key]);
    const directNeighbors = adjacency.get(selectedEntity.key);
    if (directNeighbors) {
      for (const key of directNeighbors) candidateKeys.add(key);
    }

    const clusterLabels = new Set<string>();
    for (const key of candidateKeys) {
      const entity = entityIndex.get(key);
      if (entity) clusterLabels.add(entity.normalizedLabel);
    }

    const paths = new Set<string>();
    for (const key of candidateKeys) {
      const entity = entityIndex.get(key);
      if (!entity) continue;
      const lower = `${entity.label} ${entity.subtitle} ${entity.description} ${entity.path}`.toLowerCase();
      if (excludedPatterns.some((term) => lower.includes(term))) continue;
      paths.add(entity.path);
    }

    if (includeRelationPaths) {
      for (const triplet of triplets) {
        const subjectLabel = normalizeKey(triplet.subject);
        const objectLabel = normalizeKey(triplet.object);
        if (!clusterLabels.has(subjectLabel) && !clusterLabels.has(objectLabel)) continue;

        const relationPath = makeRelationPath(basePath, triplet.subject, triplet.relation, triplet.object);
        const lower = relationPath.toLowerCase();
        if (excludedPatterns.some((term) => lower.includes(term))) continue;
        paths.add(relationPath);
      }
    }

    return Array.from(paths).sort((a, b) => a.localeCompare(b));
  }, [adjacency, basePath, entityIndex, excludedPatterns, includeRelationPaths, selectedEntity, triplets]);

  const previewText = useMemo(() => formatPathList(localPaths, outputFormat), [localPaths, outputFormat]);

  const copyPaths = async () => {
    if (!localPaths.length) return;
    try {
      await navigator.clipboard.writeText(previewText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  };

  const stats = [
    { label: "Sources", value: counts.sources, tone: "var(--accent)" },
    { label: "Robots", value: counts.robots, tone: "#0f766e" },
    { label: "Contributions", value: counts.contributions, tone: "#2563eb" },
    { label: "Inventory", value: counts.inventory, tone: "#a16207" },
    { label: "Triplets", value: counts.triplets, tone: "#7c3aed" }
  ];

  const selectedNeighbors = selectedEntity ? Array.from(adjacency.get(selectedEntity.key) || []).map((key) => entityIndex.get(key)).filter(Boolean) as LocalEntity[] : [];

  return (
    <main className="atlas-page atlas-paths">
      <style>{`
        .atlas-paths {
          min-height: 100vh;
          padding: 24px;
          background:
            radial-gradient(circle at top left, rgba(25, 82, 60, 0.05), transparent 38%),
            radial-gradient(circle at top right, rgba(15, 118, 110, 0.04), transparent 30%),
            linear-gradient(180deg, rgba(247, 250, 248, 0.94), rgba(244, 247, 245, 1));
        }

        .atlas-paths-shell {
          max-width: 1480px;
          margin: 0 auto;
          display: grid;
          gap: 18px;
        }

        .atlas-paths-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-end;
        }

        .atlas-paths-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: 0;
        }

        .atlas-paths-desc {
          margin: 8px 0 0;
          color: var(--text-secondary);
          max-width: 820px;
          line-height: 1.55;
          font-size: 14px;
        }

        .atlas-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .atlas-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.82);
          color: var(--text-primary);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 8px 20px rgba(18, 28, 23, 0.04);
        }

        .atlas-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: minmax(320px, 430px) minmax(0, 1fr);
          align-items: start;
        }

        .atlas-panel {
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 12px 30px rgba(18, 28, 23, 0.05);
          backdrop-filter: blur(8px);
        }

        .atlas-panel-header {
          padding: 18px 18px 0;
        }

        .atlas-panel-body {
          padding: 18px;
        }

        .atlas-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px;
          font-size: 14px;
          font-weight: 800;
          color: var(--text-primary);
        }

        .atlas-field {
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
        }

        .atlas-label {
          font-size: 11px;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .atlas-input,
        .atlas-select,
        .atlas-textarea {
          width: 100%;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-primary);
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
        }

        .atlas-textarea {
          min-height: 86px;
          resize: vertical;
        }

        .atlas-input:focus,
        .atlas-select:focus,
        .atlas-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(25, 82, 60, 0.08);
        }

        .atlas-toggle-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .atlas-toggle {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: rgba(250, 251, 250, 0.9);
          font-size: 12px;
          color: var(--text-primary);
        }

        .atlas-type-filters {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 14px;
        }

        .atlas-chip {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.84);
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-primary);
          text-align: center;
          transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease;
        }

        .atlas-chip:hover {
          transform: translateY(-1px);
          border-color: var(--accent);
          color: var(--accent);
        }

        .atlas-chip.active {
          background: rgba(25, 82, 60, 0.08);
          border-color: rgba(25, 82, 60, 0.34);
          color: var(--accent);
        }

        .atlas-list {
          display: grid;
          gap: 8px;
          max-height: 540px;
          overflow: auto;
          padding-right: 4px;
        }

        .atlas-list-item {
          width: 100%;
          text-align: left;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.88);
          transition: border-color 0.16s ease, transform 0.16s ease, background 0.16s ease;
        }

        .atlas-list-item:hover {
          transform: translateY(-1px);
          border-color: rgba(25, 82, 60, 0.25);
        }

        .atlas-list-item.active {
          border-color: var(--accent);
          background: rgba(25, 82, 60, 0.05);
        }

        .atlas-list-top {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: space-between;
        }

        .atlas-list-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.35;
          word-break: break-word;
        }

        .atlas-list-subtitle,
        .atlas-list-description {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.45;
          margin-top: 4px;
          word-break: break-word;
        }

        .atlas-list-path {
          margin-top: 8px;
          font-size: 11px;
          color: var(--accent);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          word-break: break-all;
        }

        .atlas-inline-statgrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .atlas-stat {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.86);
        }

        .atlas-stat-value {
          display: block;
          margin-top: 4px;
          font-size: 19px;
          font-weight: 900;
          color: var(--text-primary);
        }

        .atlas-path-output {
          display: grid;
          gap: 14px;
        }

        .atlas-path-box {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 14px;
          background: rgba(4, 10, 8, 0.97);
          color: #d1fae5;
          min-height: 260px;
          white-space: pre-wrap;
          word-break: break-all;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          line-height: 1.6;
        }

        .atlas-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }

        .atlas-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--accent);
          background: var(--accent);
          color: white;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 800;
        }

        .atlas-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .atlas-hint {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .atlas-divider {
          height: 1px;
          background: var(--border);
          margin: 16px 0;
        }

        .atlas-neighbor-list {
          display: grid;
          gap: 8px;
        }

        .atlas-neighbor-item {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.84);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .atlas-neighbor-item code {
          font-size: 11px;
          color: var(--accent);
        }

        .atlas-empty {
          border: 1px dashed var(--border);
          border-radius: 10px;
          padding: 20px;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.68);
          line-height: 1.6;
        }

        @media (max-width: 1180px) {
          .atlas-grid {
            grid-template-columns: 1fr;
          }

          .atlas-type-filters,
          .atlas-inline-statgrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .atlas-paths {
            padding: 16px;
          }

          .atlas-paths-title {
            font-size: 24px;
          }

          .atlas-type-filters,
          .atlas-inline-statgrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="atlas-paths-shell">
        <header className="atlas-paths-header">
          <div>
            <h1 className="atlas-paths-title">{t.networkTitle}</h1>
            <p className="atlas-paths-desc">{t.networkDesc}</p>
          </div>
          <div className="atlas-badges" aria-label="Live data summary">
            <span className="atlas-badge"><Sparkles size={14} /> Live database</span>
            <span className="atlas-badge"><Link2 size={14} /> {localPaths.length} paths</span>
            <span className="atlas-badge"><FileText size={14} /> {counts.triplets} triplets</span>
          </div>
        </header>

        <div className="atlas-inline-statgrid">
          {stats.map((stat) => (
            <div key={stat.label} className="atlas-stat">
              <span className="atlas-label">{stat.label}</span>
              <span className="atlas-stat-value" style={{ color: stat.tone }}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="atlas-grid">
          <section className="atlas-panel">
            <div className="atlas-panel-header">
              <h2 className="atlas-section-title">
                <Filter size={16} /> {t.copyLocalGraphPaths}
              </h2>
            </div>
            <div className="atlas-panel-body">
              <div className="atlas-field">
                <label className="atlas-label" htmlFor="base-path">{t.basePathLabel}</label>
                <input
                  id="base-path"
                  className="atlas-input"
                  value={basePath}
                  onChange={(event) => setBasePath(event.target.value)}
                  placeholder="C:/Users/HP OMEN/Obsidian Vault"
                />
                <div className="atlas-hint">{t.basePathDesc}</div>
              </div>

              <div className="atlas-field">
                <label className="atlas-label" htmlFor="output-format">{t.outputFormatLabel}</label>
                <select
                  id="output-format"
                  className="atlas-select"
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value as "newline" | "semicolon")}
                >
                  <option value="newline">{t.newlineSeparated}</option>
                  <option value="semicolon">{t.semicolonSeparated}</option>
                </select>
                <div className="atlas-hint">{t.outputFormatDesc}</div>
              </div>

              <div className="atlas-field">
                <label className="atlas-label" htmlFor="excluded-terms">{t.excludedFoldersLabel}</label>
                <textarea
                  id="excluded-terms"
                  className="atlas-textarea"
                  value={excludedTerms}
                  onChange={(event) => setExcludedTerms(event.target.value)}
                  placeholder="draft, temp, concept"
                />
                <div className="atlas-hint">{t.excludedFoldersDesc}</div>
              </div>

              <div className="atlas-toggle-row">
                <label className="atlas-toggle">
                  <input
                    type="checkbox"
                    checked={includeRelationPaths}
                    onChange={(event) => setIncludeRelationPaths(event.target.checked)}
                  />
                  <span>Include relation notes</span>
                </label>
              </div>

              <div className="atlas-type-filters" role="tablist" aria-label="Entity types">
                <button type="button" className={`atlas-chip ${entityKind === "all" ? "active" : ""}`} onClick={() => setEntityKind("all")}>
                  All
                </button>
                <button type="button" className={`atlas-chip ${entityKind === "source" ? "active" : ""}`} onClick={() => setEntityKind("source")}>
                  Sources
                </button>
                <button type="button" className={`atlas-chip ${entityKind === "robot" ? "active" : ""}`} onClick={() => setEntityKind("robot")}>
                  Robots
                </button>
                <button type="button" className={`atlas-chip ${entityKind === "contribution" ? "active" : ""}`} onClick={() => setEntityKind("contribution")}>
                  Contributions
                </button>
                <button type="button" className={`atlas-chip ${entityKind === "inventory" ? "active" : ""}`} onClick={() => setEntityKind("inventory")}>
                  Inventory
                </button>
              </div>

              <div className="atlas-field">
                <label className="atlas-label" htmlFor="search-entities">Search records</label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    id="search-entities"
                    className="atlas-input"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Find sources, robots, or notes"
                    style={{ paddingLeft: "36px" }}
                  />
                </div>
              </div>

              <div className="atlas-divider" />

              {filteredEntities.length ? (
                <div className="atlas-list" role="list" aria-label="Local graph records">
                  {filteredEntities.map((entity) => {
                    const Icon = kindMeta[entity.kind].icon;
                    const active = entity.key === selectedEntity?.key;
                    return (
                      <button
                        key={entity.key}
                        type="button"
                        className={`atlas-list-item ${active ? "active" : ""}`}
                        onClick={() => setSelectedKey(entity.key)}
                      >
                        <div className="atlas-list-top">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                            <Icon size={15} aria-hidden="true" />
                            <div className="atlas-list-title">{entity.label}</div>
                          </div>
                          <span className="atlas-label" style={{ margin: 0 }}>{kindMeta[entity.kind].label}</span>
                        </div>
                        {entity.subtitle ? <div className="atlas-list-subtitle">{entity.subtitle}</div> : null}
                        {entity.description ? <div className="atlas-list-description">{entity.description}</div> : null}
                        <div className="atlas-list-path">{entity.path}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="atlas-empty">{t.noPathsWarning}</div>
              )}
            </div>
          </section>

          <section className="atlas-panel">
            <div className="atlas-panel-header">
              <h2 className="atlas-section-title">
                <Layers3 size={16} /> {t.pathPreviewLabel}
              </h2>
            </div>
            <div className="atlas-panel-body atlas-path-output">
              {selectedEntity ? (
                <>
                  <div className="atlas-field" style={{ marginBottom: 0 }}>
                    <label className="atlas-label">Selected record</label>
                    <div className="atlas-neighbor-item">
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-primary)" }}>{selectedEntity.label}</div>
                        <div className="atlas-list-subtitle" style={{ marginTop: "3px" }}>
                          {kindMeta[selectedEntity.kind].label} | {selectedEntity.subtitle || "No secondary metadata"}
                        </div>
                      </div>
                      <code>{selectedEntity.path}</code>
                    </div>
                  </div>

                  <div className="atlas-field" style={{ marginBottom: 0 }}>
                    <label className="atlas-label">Local neighbors</label>
                    {selectedNeighbors.length ? (
                      <div className="atlas-neighbor-list">
                        {selectedNeighbors.map((neighbor) => {
                          if (!neighbor) return null;
                          const Icon = kindMeta[neighbor.kind].icon;
                          return (
                            <div key={neighbor.key} className="atlas-neighbor-item">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                <Icon size={14} />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", wordBreak: "break-word" }}>{neighbor.label}</div>
                                  <div className="atlas-list-subtitle" style={{ marginTop: "2px" }}>{kindMeta[neighbor.kind].label}</div>
                                </div>
                              </div>
                              <code>{neighbor.path}</code>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="atlas-empty">No linked records were found for this selection.</div>
                    )}
                  </div>

                  <div>
                    <div className="atlas-actions">
                      <button type="button" className="atlas-button" onClick={copyPaths} disabled={!localPaths.length}>
                        {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
                        {t.copyButtonLabel}
                      </button>
                      <span className="atlas-hint">
                        {localPaths.length ? `${localPaths.length} paths ready` : t.noPathsWarning}
                      </span>
                    </div>
                    <div className="atlas-hint" style={{ marginTop: "10px" }}>
                      {copyState === "copied" ? "Copied to clipboard." : copyState === "failed" ? "Clipboard access failed." : ""}
                    </div>
                  </div>

                  <div className="atlas-path-box">{localPaths.length ? previewText : t.noPathsWarning}</div>
                </>
              ) : (
                <div className="atlas-empty">{t.noPathsWarning}</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
