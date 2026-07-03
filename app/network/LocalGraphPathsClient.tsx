"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  Boxes,
  Check,
  Copy,
  Database,
  FileText,
  Filter,
  FlaskConical,
  GitFork,
  Link2,
  Maximize2,
  Network,
  Search,
  Sparkles
} from "lucide-react";
import { getTranslation, type Language } from "@/lib/translations";

type EntityKind = "source" | "robot" | "contribution" | "inventory" | "concept";
type DataKind = Exclude<EntityKind, "concept">;

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

type GraphNode = {
  key: string;
  kind: EntityKind;
  id: string;
  label: string;
  path: string;
  subtitle: string;
  description: string;
  normalizedLabel: string;
};

type GraphEdge = {
  key: string;
  from: string;
  to: string;
  label: string;
  strength: number;
  evidencePath?: string;
};

type PositionedNode = GraphNode & {
  x: number;
  y: number;
  ring: number;
};

const graphWidth = 920;
const graphHeight = 620;
const centerX = graphWidth / 2;
const centerY = graphHeight / 2;

const kindMeta: Record<EntityKind, { label: string; folder: string; color: string; icon: typeof FileText }> = {
  source: { label: "Source", folder: "sources", color: "#4a7c59", icon: FileText },
  robot: { label: "Robot", folder: "robots", color: "#0f766e", icon: Bot },
  contribution: { label: "Contribution", folder: "contributions", color: "#2563eb", icon: FlaskConical },
  inventory: { label: "Inventory", folder: "inventory", color: "#a16207", icon: Boxes },
  concept: { label: "Concept", folder: "concepts", color: "#7c3aed", icon: GitFork }
};

const normalizeKey = (value: string) => value.trim().toLowerCase();

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "untitled";

const joinSegments = (basePath: string, ...parts: string[]) => {
  const base = basePath.trim().replace(/[\\/]+$/, "");
  const pathParts = parts.filter(Boolean).map((part) => part.replace(/^[\\/]+|[\\/]+$/g, ""));
  if (!base) return pathParts.join("/");

  const useBackslash = base.includes("\\") && !base.includes("/");
  return [base, ...pathParts].join(useBackslash ? "\\" : "/");
};

const makeSourcePath = (row: SourceRow, basePath: string) => {
  const folder = slugify(row.platform || row.sourceType || "source");
  return joinSegments(basePath, kindMeta.source.folder, folder, `${slugify(row.title)}.md`);
};

const makePath = (kind: EntityKind, label: string, basePath: string) =>
  joinSegments(basePath, kindMeta[kind].folder, `${slugify(label)}.md`);

const makeRelationPath = (basePath: string, subject: string, relation: string, object: string) =>
  joinSegments(basePath, "relations", `${slugify(subject)}__${slugify(relation)}__${slugify(object)}.md`);

const formatPathList = (paths: string[], format: "newline" | "semicolon") =>
  format === "semicolon" ? paths.join("; ") : paths.join("\n");

const truncate = (value: string, max = 34) => (value.length > max ? `${value.slice(0, max - 1)}...` : value);

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
  const [searchText, setSearchText] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | DataKind | "concept">("all");
  const [selectedKey, setSelectedKey] = useState("");
  const [showSecondRing, setShowSecondRing] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const graph = useMemo(() => {
    const nodes = new Map<string, GraphNode>();
    const labelIndex = new Map<string, string[]>();
    const edges = new Map<string, GraphEdge>();

    const addNode = (node: GraphNode) => {
      nodes.set(node.key, node);
      const labels = labelIndex.get(node.normalizedLabel) || [];
      labels.push(node.key);
      labelIndex.set(node.normalizedLabel, labels);
    };

    const addEdge = (edge: GraphEdge) => {
      if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to) return;
      edges.set(edge.key, edge);
    };

    for (const row of sources) {
      addNode({
        key: `source:${row.id}`,
        kind: "source",
        id: row.id,
        label: row.title,
        path: makeSourcePath(row, basePath),
        subtitle: [row.platform || row.sourceType, row.publishedAt ? new Date(row.publishedAt).getFullYear() : ""].filter(Boolean).join(" | "),
        description: row.excerpt || row.url,
        normalizedLabel: normalizeKey(row.title)
      });
    }

    for (const row of robots) {
      addNode({
        key: `robot:${row.id}`,
        kind: "robot",
        id: row.id,
        label: row.canonicalName,
        path: makePath("robot", row.canonicalName, basePath),
        subtitle: [row.robotType, row.manufacturer || row.primaryUseCase || ""].filter(Boolean).join(" | "),
        description: row.description || row.primaryUseCase || row.manufacturer || "",
        normalizedLabel: normalizeKey(row.canonicalName)
      });
    }

    for (const row of contributions) {
      addNode({
        key: `contribution:${row.id}`,
        kind: "contribution",
        id: row.id,
        label: row.title,
        path: makePath("contribution", row.title, basePath),
        subtitle: [row.contributionType, row.organization || row.contributorName || ""].filter(Boolean).join(" | "),
        description: row.description || row.organization || row.contributorName || "",
        normalizedLabel: normalizeKey(row.title)
      });
    }

    for (const row of inventory) {
      addNode({
        key: `inventory:${row.id}`,
        kind: "inventory",
        id: row.id,
        label: row.displayName,
        path: makePath("inventory", row.displayName, basePath),
        subtitle: [row.ownershipStatus, row.locationLabel || row.ownerOrg || ""].filter(Boolean).join(" | "),
        description: row.notes || row.locationLabel || row.ownerOrg || "",
        normalizedLabel: normalizeKey(row.displayName)
      });
    }

    for (const row of contributions) {
      if (row.relatedRobotModelId) {
        addEdge({
          key: `contribution:${row.id}->robot:${row.relatedRobotModelId}`,
          from: `contribution:${row.id}`,
          to: `robot:${row.relatedRobotModelId}`,
          label: "contributes to",
          strength: 0.9
        });
      }
    }

    for (const row of inventory) {
      if (row.robotModelId) {
        addEdge({
          key: `inventory:${row.id}->robot:${row.robotModelId}`,
          from: `inventory:${row.id}`,
          to: `robot:${row.robotModelId}`,
          label: "instance of",
          strength: 0.9
        });
      }
    }

    const resolveConcept = (label: string) => {
      const normalizedLabel = normalizeKey(label);
      const existing = labelIndex.get(normalizedLabel);
      if (existing?.length) return existing[0];

      const key = `concept:${slugify(label).toLowerCase()}`;
      if (!nodes.has(key)) {
        addNode({
          key,
          kind: "concept",
          id: key,
          label,
          path: makePath("concept", label, basePath),
          subtitle: "Triplet concept",
          description: "Concept inferred from subject/object relation data.",
          normalizedLabel
        });
      }
      return key;
    };

    for (const triplet of triplets) {
      const subjectKey = resolveConcept(triplet.subject);
      const objectKey = resolveConcept(triplet.object);
      const evidencePath = makeRelationPath(basePath, triplet.subject, triplet.relation, triplet.object);

      addEdge({
        key: `triplet:${triplet.id}:subject-object`,
        from: subjectKey,
        to: objectKey,
        label: triplet.relation,
        strength: triplet.confidence,
        evidencePath
      });

      if (triplet.sourceId) {
        const sourceKey = `source:${triplet.sourceId}`;
        addEdge({
          key: `triplet:${triplet.id}:source-subject`,
          from: sourceKey,
          to: subjectKey,
          label: "supports",
          strength: triplet.confidence,
          evidencePath
        });
        addEdge({
          key: `triplet:${triplet.id}:source-object`,
          from: sourceKey,
          to: objectKey,
          label: "mentions",
          strength: triplet.confidence,
          evidencePath
        });
      }
    }

    const adjacency = new Map<string, Set<string>>();
    const directed = Array.from(edges.values());
    for (const node of nodes.values()) adjacency.set(node.key, new Set());
    for (const edge of directed) {
      adjacency.get(edge.from)?.add(edge.to);
      adjacency.get(edge.to)?.add(edge.from);
    }

    return { nodes, edges: directed, adjacency };
  }, [basePath, contributions, inventory, robots, sources, triplets]);

  const allNodes = useMemo(() => Array.from(graph.nodes.values()), [graph.nodes]);

  const filteredNodes = useMemo(() => {
    const terms = searchText.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return allNodes.filter((node) => {
      if (kindFilter !== "all" && node.kind !== kindFilter) return false;
      if (!terms.length) return true;
      const haystack = [node.label, node.subtitle, node.description, node.path, kindMeta[node.kind].label].join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [allNodes, kindFilter, searchText]);

  useEffect(() => {
    if (!filteredNodes.length) {
      setSelectedKey("");
      return;
    }
    if (!filteredNodes.some((node) => node.key === selectedKey)) {
      setSelectedKey(filteredNodes[0].key);
    }
  }, [filteredNodes, selectedKey]);

  const selectedNode = graph.nodes.get(selectedKey) || filteredNodes[0] || null;

  const visibleKeys = useMemo(() => {
    if (!selectedNode) return new Set<string>();

    const keys = new Set<string>([selectedNode.key]);
    const firstRing = graph.adjacency.get(selectedNode.key) || new Set<string>();
    for (const key of firstRing) keys.add(key);

    if (showSecondRing) {
      for (const key of firstRing) {
        const next = graph.adjacency.get(key) || new Set<string>();
        for (const nextKey of next) keys.add(nextKey);
      }
    }

    return keys;
  }, [graph.adjacency, selectedNode, showSecondRing]);

  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => visibleKeys.has(edge.from) && visibleKeys.has(edge.to)).slice(0, 140),
    [graph.edges, visibleKeys]
  );

  const positionedNodes = useMemo(() => {
    if (!selectedNode) return [];

    const firstRing = Array.from(graph.adjacency.get(selectedNode.key) || []).filter((key) => visibleKeys.has(key));
    const remaining = Array.from(visibleKeys).filter((key) => key !== selectedNode.key && !firstRing.includes(key));
    const orderedKeys = [selectedNode.key, ...firstRing.slice(0, 28), ...remaining.slice(0, 48)];

    return orderedKeys
      .map((key, index): PositionedNode | null => {
        const node = graph.nodes.get(key);
        if (!node) return null;

        if (key === selectedNode.key) {
          return { ...node, x: centerX, y: centerY, ring: 0 };
        }

        const inFirstRing = firstRing.includes(key);
        const ringNodes = inFirstRing ? Math.min(firstRing.length, 28) : Math.min(remaining.length, 48);
        const ringIndex = inFirstRing ? firstRing.indexOf(key) : remaining.indexOf(key);
        const angle = (Math.PI * 2 * ringIndex) / Math.max(1, ringNodes) - Math.PI / 2;
        const radius = inFirstRing ? 185 : 275;
        const wobble = inFirstRing ? 0 : (index % 3) * 12;

        return {
          ...node,
          x: centerX + Math.cos(angle) * (radius + wobble),
          y: centerY + Math.sin(angle) * (radius + wobble),
          ring: inFirstRing ? 1 : 2
        };
      })
      .filter(Boolean) as PositionedNode[];
  }, [graph.adjacency, graph.nodes, selectedNode, visibleKeys]);

  const positionedIndex = useMemo(() => {
    const index = new Map<string, PositionedNode>();
    for (const node of positionedNodes) index.set(node.key, node);
    return index;
  }, [positionedNodes]);

  const excludedPatterns = useMemo(
    () => excludedTerms.split(",").map((term) => term.trim().toLowerCase()).filter(Boolean),
    [excludedTerms]
  );

  const localPaths = useMemo(() => {
    const paths = new Set<string>();

    for (const key of visibleKeys) {
      const node = graph.nodes.get(key);
      if (!node) continue;
      const lower = `${node.label} ${node.subtitle} ${node.description} ${node.path}`.toLowerCase();
      if (!excludedPatterns.some((term) => lower.includes(term))) paths.add(node.path);
    }

    for (const edge of visibleEdges) {
      if (!edge.evidencePath) continue;
      const lower = edge.evidencePath.toLowerCase();
      if (!excludedPatterns.some((term) => lower.includes(term))) paths.add(edge.evidencePath);
    }

    return Array.from(paths).sort((a, b) => a.localeCompare(b));
  }, [excludedPatterns, graph.nodes, visibleEdges, visibleKeys]);

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
    { label: "Sources", value: counts.sources, tone: kindMeta.source.color },
    { label: "Robots", value: counts.robots, tone: kindMeta.robot.color },
    { label: "Contributions", value: counts.contributions, tone: kindMeta.contribution.color },
    { label: "Inventory", value: counts.inventory, tone: kindMeta.inventory.color },
    { label: "Triplets", value: counts.triplets, tone: kindMeta.concept.color }
  ];

  return (
    <main className="graph-page">
      <style>{`
        .graph-page {
          min-height: 100vh;
          padding: 24px;
          background: #f7f8f5;
        }

        .graph-shell {
          max-width: 1540px;
          margin: 0 auto;
          display: grid;
          gap: 16px;
        }

        .graph-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
        }

        .graph-title {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
          letter-spacing: 0;
          color: var(--text-primary);
        }

        .graph-desc {
          margin: 8px 0 0;
          color: var(--text-secondary);
          max-width: 820px;
        }

        .graph-badges,
        .graph-actions,
        .graph-filter-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .graph-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: #fff;
          color: var(--text-primary);
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(18, 28, 23, 0.04);
        }

        .graph-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
        }

        .graph-stat,
        .graph-panel {
          border: 1px solid var(--border);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 12px 28px rgba(18, 28, 23, 0.05);
        }

        .graph-stat {
          padding: 12px;
        }

        .graph-label {
          display: block;
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .graph-stat strong {
          display: block;
          margin-top: 4px;
          font-size: 20px;
        }

        .graph-layout {
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr) 360px;
          gap: 16px;
          align-items: start;
        }

        .graph-panel-header {
          padding: 16px 16px 0;
        }

        .graph-panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 900;
        }

        .graph-panel-body {
          padding: 16px;
        }

        .graph-field {
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
        }

        .graph-input,
        .graph-select,
        .graph-textarea {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #fff;
          color: var(--text-primary);
          padding: 10px 12px;
          font-size: 13px;
        }

        .graph-textarea {
          min-height: 76px;
          resize: vertical;
        }

        .graph-input:focus,
        .graph-select:focus,
        .graph-textarea:focus {
          outline: 2px solid rgba(74, 124, 89, 0.2);
          border-color: var(--accent);
        }

        .graph-chip {
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 999px;
          padding: 8px 10px;
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .graph-chip.active {
          border-color: var(--accent);
          background: rgba(74, 124, 89, 0.09);
          color: var(--accent);
        }

        .graph-list {
          display: grid;
          gap: 8px;
          max-height: 560px;
          overflow: auto;
          padding-right: 4px;
        }

        .graph-list-item {
          width: 100%;
          display: grid;
          gap: 5px;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          padding: 11px;
          text-align: left;
        }

        .graph-list-item.active {
          border-color: var(--accent);
          background: rgba(74, 124, 89, 0.06);
        }

        .graph-list-top {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          align-items: flex-start;
        }

        .graph-list-title {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 900;
          line-height: 1.35;
          word-break: break-word;
        }

        .graph-muted {
          color: var(--text-secondary);
          font-size: 12px;
          line-height: 1.45;
        }

        .graph-path {
          color: var(--accent);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 11px;
          word-break: break-all;
        }

        .graph-canvas-wrap {
          overflow: hidden;
        }

        .graph-canvas-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
        }

        .graph-toggle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 800;
        }

        .graph-svg {
          display: block;
          width: 100%;
          height: min(66vh, 680px);
          min-height: 520px;
          background:
            linear-gradient(rgba(46, 50, 48, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(46, 50, 48, 0.035) 1px, transparent 1px),
            #fbfcfa;
          background-size: 28px 28px;
        }

        .graph-edge {
          stroke: #87968f;
          stroke-width: 1.6;
          opacity: 0.72;
        }

        .graph-edge.active {
          stroke: var(--accent);
          stroke-width: 2.3;
          opacity: 0.96;
        }

        .graph-edge-label {
          fill: #52615a;
          font-size: 10px;
          font-weight: 800;
          paint-order: stroke;
          stroke: #fbfcfa;
          stroke-width: 4px;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .graph-node {
          cursor: pointer;
        }

        .graph-node circle {
          stroke: #fff;
          stroke-width: 3;
          filter: drop-shadow(0 7px 10px rgba(18, 28, 23, 0.16));
        }

        .graph-node.selected circle {
          stroke: #111f19;
          stroke-width: 4;
        }

        .graph-node-label {
          fill: #24302b;
          font-size: 11px;
          font-weight: 900;
          text-anchor: middle;
          paint-order: stroke;
          stroke: #fbfcfa;
          stroke-width: 5px;
          stroke-linejoin: round;
        }

        .graph-node-kind {
          fill: #6b756f;
          font-size: 9px;
          font-weight: 800;
          text-anchor: middle;
          text-transform: uppercase;
          paint-order: stroke;
          stroke: #fbfcfa;
          stroke-width: 4px;
        }

        .graph-detail-card {
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #fff;
          padding: 12px;
          display: grid;
          gap: 8px;
        }

        .graph-output {
          border: 1px solid var(--border);
          border-radius: 9px;
          background: #07120e;
          color: #d7fbe8;
          min-height: 220px;
          padding: 12px;
          white-space: pre-wrap;
          word-break: break-all;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 12px;
          line-height: 1.55;
        }

        .graph-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--accent);
          border-radius: 8px;
          background: var(--accent);
          color: #fff;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 900;
        }

        .graph-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .graph-empty {
          border: 1px dashed var(--border);
          border-radius: 9px;
          padding: 18px;
          color: var(--text-secondary);
          background: #fff;
        }

        @media (max-width: 1280px) {
          .graph-layout {
            grid-template-columns: 320px minmax(0, 1fr);
          }

          .graph-detail {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 860px) {
          .graph-page {
            padding: 16px;
          }

          .graph-header,
          .graph-canvas-toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .graph-stats,
          .graph-layout {
            grid-template-columns: 1fr;
          }

          .graph-title {
            font-size: 24px;
          }

          .graph-svg {
            height: 520px;
            min-height: 520px;
          }
        }
      `}</style>

      <div className="graph-shell">
        <header className="graph-header">
          <div>
            <h1 className="graph-title">{t.networkTitle}</h1>
            <p className="graph-desc">
              Select any atlas record to redraw its local graph. Arrows show direction of influence, support, mention, ownership, or semantic relation between data nodes.
            </p>
          </div>
          <div className="graph-badges">
            <span className="graph-badge"><Sparkles size={14} /> Live database</span>
            <span className="graph-badge"><Network size={14} /> {positionedNodes.length} visible nodes</span>
            <span className="graph-badge"><Link2 size={14} /> {visibleEdges.length} arrows</span>
          </div>
        </header>

        <section className="graph-stats" aria-label="Graph data summary">
          {stats.map((stat) => (
            <div key={stat.label} className="graph-stat">
              <span className="graph-label">{stat.label}</span>
              <strong style={{ color: stat.tone }}>{stat.value}</strong>
            </div>
          ))}
        </section>

        <div className="graph-layout">
          <aside className="graph-panel">
            <div className="graph-panel-header">
              <h2 className="graph-panel-title"><Filter size={16} /> Graph controls</h2>
            </div>
            <div className="graph-panel-body">
              <div className="graph-field">
                <label className="graph-label" htmlFor="search-graph">Search node</label>
                <div style={{ position: "relative" }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
                  <input
                    id="search-graph"
                    className="graph-input"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Robot, source, organization"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>

              <div className="graph-field">
                <span className="graph-label">Node type</span>
                <div className="graph-filter-row">
                  {(["all", "source", "robot", "contribution", "inventory", "concept"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      className={`graph-chip ${kindFilter === kind ? "active" : ""}`}
                      onClick={() => setKindFilter(kind)}
                    >
                      {kind === "all" ? "All" : kindMeta[kind].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="graph-field">
                <label className="graph-label" htmlFor="base-path">{t.basePathLabel}</label>
                <input
                  id="base-path"
                  className="graph-input"
                  value={basePath}
                  onChange={(event) => setBasePath(event.target.value)}
                  placeholder="C:/Users/HP OMEN/Obsidian Vault"
                />
              </div>

              <div className="graph-field">
                <label className="graph-label" htmlFor="excluded-terms">{t.excludedFoldersLabel}</label>
                <textarea
                  id="excluded-terms"
                  className="graph-textarea"
                  value={excludedTerms}
                  onChange={(event) => setExcludedTerms(event.target.value)}
                  placeholder="draft, temp, archive"
                />
              </div>

              <div className="graph-field">
                <label className="graph-label" htmlFor="output-format">{t.outputFormatLabel}</label>
                <select
                  id="output-format"
                  className="graph-select"
                  value={outputFormat}
                  onChange={(event) => setOutputFormat(event.target.value as "newline" | "semicolon")}
                >
                  <option value="newline">{t.newlineSeparated}</option>
                  <option value="semicolon">{t.semicolonSeparated}</option>
                </select>
              </div>

              <div className="graph-list" aria-label="Graph nodes">
                {filteredNodes.slice(0, 120).map((node) => {
                  const Icon = kindMeta[node.kind].icon;
                  const active = node.key === selectedNode?.key;
                  return (
                    <button
                      key={node.key}
                      type="button"
                      className={`graph-list-item ${active ? "active" : ""}`}
                      onClick={() => setSelectedKey(node.key)}
                    >
                      <div className="graph-list-top">
                        <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                          <Icon size={15} color={kindMeta[node.kind].color} />
                          <span className="graph-list-title">{node.label}</span>
                        </div>
                        <span className="graph-label">{kindMeta[node.kind].label}</span>
                      </div>
                      {node.subtitle ? <span className="graph-muted">{node.subtitle}</span> : null}
                      <span className="graph-path">{node.path}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="graph-panel graph-canvas-wrap">
            <div className="graph-canvas-toolbar">
              <div>
                <h2 className="graph-panel-title"><Network size={16} /> Obsidian-style local graph</h2>
                <div className="graph-muted">
                  {selectedNode ? `${selectedNode.label} is centered with linked neighbors and directed relations.` : "No node selected."}
                </div>
              </div>
              <label className="graph-toggle">
                <input type="checkbox" checked={showSecondRing} onChange={(event) => setShowSecondRing(event.target.checked)} />
                <span><Maximize2 size={14} /> Show second-ring links</span>
              </label>
            </div>

            {selectedNode ? (
              <svg className="graph-svg" viewBox={`0 0 ${graphWidth} ${graphHeight}`} role="img" aria-label="Directed relationship graph">
                <defs>
                  <marker id="graph-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L8,3 z" fill="#87968f" />
                  </marker>
                  <marker id="graph-arrow-active" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L8,3 z" fill="#4a7c59" />
                  </marker>
                </defs>

                {visibleEdges.map((edge) => {
                  const from = positionedIndex.get(edge.from);
                  const to = positionedIndex.get(edge.to);
                  if (!from || !to) return null;

                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
                  const nodeRadius = to.key === selectedNode.key ? 30 : 23;
                  const startX = from.x + (dx / length) * 25;
                  const startY = from.y + (dy / length) * 25;
                  const endX = to.x - (dx / length) * nodeRadius;
                  const endY = to.y - (dy / length) * nodeRadius;
                  const midX = (startX + endX) / 2;
                  const midY = (startY + endY) / 2;
                  const active = edge.from === selectedNode.key || edge.to === selectedNode.key;

                  return (
                    <g key={edge.key}>
                      <line
                        className={`graph-edge ${active ? "active" : ""}`}
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        markerEnd={active ? "url(#graph-arrow-active)" : "url(#graph-arrow)"}
                      />
                      <text className="graph-edge-label" x={midX} y={midY - 5} textAnchor="middle">
                        {truncate(edge.label, 24)}
                      </text>
                    </g>
                  );
                })}

                {positionedNodes.map((node) => {
                  const selected = node.key === selectedNode.key;
                  const radius = selected ? 31 : node.ring === 1 ? 24 : 19;
                  return (
                    <g
                      key={node.key}
                      className={`graph-node ${selected ? "selected" : ""}`}
                      transform={`translate(${node.x} ${node.y})`}
                      onClick={() => setSelectedKey(node.key)}
                    >
                      <circle r={radius} fill={kindMeta[node.kind].color} opacity={node.ring === 2 ? 0.82 : 1} />
                      <text className="graph-node-label" y={radius + 18}>{truncate(node.label, selected ? 36 : 26)}</text>
                      <text className="graph-node-kind" y={radius + 32}>{kindMeta[node.kind].label}</text>
                    </g>
                  );
                })}
              </svg>
            ) : (
              <div className="graph-empty">No graph nodes match the current filters.</div>
            )}
          </section>

          <aside className="graph-panel graph-detail">
            <div className="graph-panel-header">
              <h2 className="graph-panel-title"><Database size={16} /> Node details</h2>
            </div>
            <div className="graph-panel-body" style={{ display: "grid", gap: 12 }}>
              {selectedNode ? (
                <>
                  <div className="graph-detail-card">
                    <span className="graph-label">{kindMeta[selectedNode.kind].label}</span>
                    <strong className="graph-list-title">{selectedNode.label}</strong>
                    {selectedNode.subtitle ? <span className="graph-muted">{selectedNode.subtitle}</span> : null}
                    {selectedNode.description ? <span className="graph-muted">{selectedNode.description}</span> : null}
                    <span className="graph-path">{selectedNode.path}</span>
                  </div>

                  <div className="graph-actions">
                    <button type="button" className="graph-button" onClick={copyPaths} disabled={!localPaths.length}>
                      {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
                      {t.copyButtonLabel}
                    </button>
                    <span className="graph-muted">
                      {copyState === "copied" ? "Copied." : copyState === "failed" ? "Clipboard failed." : `${localPaths.length} local paths`}
                    </span>
                  </div>

                  <div>
                    <span className="graph-label">{t.pathPreviewLabel}</span>
                    <div className="graph-output">{localPaths.length ? previewText : t.noPathsWarning}</div>
                  </div>
                </>
              ) : (
                <div className="graph-empty">{t.noPathsWarning}</div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
