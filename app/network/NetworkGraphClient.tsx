"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, EdgeSingular, ElementDefinition, NodeSingular } from "cytoscape";
import CircularProgress from "@mui/material/CircularProgress";
import { networkStyles } from "./cytoscapeStyles";
import styles from "./NetworkGraphClient.module.css";

type NetworkNode = {
  id: string;
  label: string;
  type: string;
  cluster: string;
  description: string | null;
  organization: string | null;
  country: string | null;
  robot_type?: string | null;
  confidence: number;
  source_count: number;
  degree: number;
  is_private: boolean;
  is_low_confidence: boolean;
  url: string | null;
  evidence_excerpt: string | null;
  data_origin: "database" | "import_file" | "merged";
  source_record_ids: string[];
  import_record_ids: string[];
  record_id?: string | null;
};

type NetworkEdge = {
  id: string;
  source: string;
  target: string;
  relation: string;
  label: string;
  description: string;
  confidence: number;
  weight: number;
  evidence_excerpt: string | null;
  url: string | null;
  source_platform: string | null;
  published_at: string | null;
  is_low_confidence: boolean;
  data_origin: "database" | "import_file" | "merged";
  source_record_ids: string[];
  import_record_ids: string[];
  review_status?: string | null;
};

type NetworkGraph = {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters: { id: string; label: string; node_count: number; edge_count: number }[];
  meta: {
    source_mode: "file" | "database" | "hybrid" | "auto";
    resolved_source: "database" | "file" | "hybrid" | "fallback_file";
    database_available: boolean;
    file_available: boolean;
    warnings: string[];
    node_count: number;
    edge_count: number;
    cluster_count: number;
    generated_at: string;
    truncated?: boolean;
  };
};

type Detail =
  | { kind: "node"; node: NetworkNode; incoming: NetworkEdge[]; outgoing: NetworkEdge[]; connected: NetworkNode[] }
  | { kind: "edge"; edge: NetworkEdge; subject?: NetworkNode; object?: NetworkNode }
  | null;

const allOption = "all";

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
}

function toElements(graph: NetworkGraph): ElementDefinition[] {
  return [
    ...graph.nodes.map((node) => ({
      data: node,
      classes: `${node.type} ${node.cluster} ${node.is_private ? "private" : ""} ${node.is_low_confidence ? "low-confidence" : ""}`
    })),
    ...graph.edges.map((edge) => ({
      data: edge,
      classes: `${edge.relation} ${edge.is_low_confidence ? "low-confidence" : ""}`
    }))
  ];
}

function filterGraph(
  graph: NetworkGraph,
  filters: Record<string, string>,
  toggles: {
    showLowConfidence: boolean;
    onlyReviewed: boolean;
    showOwned: boolean;
    showMedia: boolean;
    showAcademic: boolean;
  }
): NetworkGraph {
  const year = filters.year === allOption ? null : Number(filters.year);
  const confidenceMin = Number(filters.confidenceMin || 0);
  const allowedNodes = new Set<string>();
  const nodes = graph.nodes.filter((node) => {
    if (!toggles.showLowConfidence && node.is_low_confidence) return false;
    if (!toggles.showOwned && node.type === "owned_inventory") return false;
    if (!toggles.showMedia && (node.type === "perspective_annotation" || node.type === "perspective_theme" || node.cluster === "media_perspectives")) return false;
    if (!toggles.showAcademic && node.cluster === "research_and_academic_contributions") return false;
    if (toggles.onlyReviewed && node.confidence < 0.7) return false;
    if (node.confidence < confidenceMin) return false;
    if (filters.nodeType !== allOption && node.type !== filters.nodeType) return false;
    if (filters.cluster !== allOption && node.cluster !== filters.cluster) return false;
    if (filters.robotType !== allOption && node.robot_type !== filters.robotType) return false;
    if (filters.organization !== allOption && node.organization !== filters.organization) return false;
    if (filters.country !== allOption && node.country !== filters.country) return false;
    if (filters.visibility === "public" && node.is_private) return false;
    if (filters.visibility === "private" && !node.is_private) return false;
    allowedNodes.add(node.id);
    return true;
  });

  const edges = graph.edges.filter((edge) => {
    if (!allowedNodes.has(edge.source) || !allowedNodes.has(edge.target)) return false;
    if (!toggles.showLowConfidence && edge.is_low_confidence) return false;
    if (toggles.onlyReviewed && edge.confidence < 0.7) return false;
    if (edge.confidence < confidenceMin) return false;
    if (filters.relation !== allOption && edge.relation !== filters.relation) return false;
    if (filters.sourcePlatform !== allOption && edge.source_platform !== filters.sourcePlatform) return false;
    if (year && edge.published_at && new Date(edge.published_at).getFullYear() !== year) return false;
    return true;
  });

  const connected = new Set<string>();
  edges.forEach((edge) => {
    connected.add(edge.source);
    connected.add(edge.target);
  });

  return {
    ...graph,
    nodes: nodes.filter((node) => connected.has(node.id) || edges.length === 0),
    edges,
    meta: { ...graph.meta, node_count: nodes.length, edge_count: edges.length }
  };
}

function localGraph(graph: NetworkGraph, selectedId: string | null, depth: number) {
  if (!selectedId) return graph;
  const included = new Set([selectedId]);
  for (let level = 0; level < depth; level++) {
    for (const edge of graph.edges) {
      if (included.has(edge.source)) included.add(edge.target);
      if (included.has(edge.target)) included.add(edge.source);
    }
  }
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => included.has(node.id)),
    edges: graph.edges.filter((edge) => included.has(edge.source) && included.has(edge.target))
  };
}

export default function NetworkGraphClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; edge: NetworkEdge; subject?: string; object?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [maxNodes, setMaxNodes] = useState(300);
  const [sourceMode, setSourceMode] = useState<"auto" | "file" | "database" | "hybrid">("auto");
  const [showArrows, setShowArrows] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [showLowConfidence, setShowLowConfidence] = useState(true);
  const [onlyReviewed, setOnlyReviewed] = useState(false);
  const [showOwned, setShowOwned] = useState(true);
  const [showMedia, setShowMedia] = useState(true);
  const [showAcademic, setShowAcademic] = useState(true);
  const [localMode, setLocalMode] = useState(false);
  const [localDepth, setLocalDepth] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    nodeType: allOption,
    relation: allOption,
    cluster: allOption,
    robotType: allOption,
    organization: allOption,
    sourcePlatform: allOption,
    year: allOption,
    country: allOption,
    confidenceMin: "0",
    visibility: allOption
  });

  const fetchGraph = useCallback(async (limit = maxNodes, source = sourceMode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/network/graph?source=${source}&limitNodes=${limit}&limitEdges=${Math.max(800, limit * 3)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Graph API returned ${response.status}`);
      const payload = await response.json() as NetworkGraph & { error?: string };
      if (payload.error) throw new Error(payload.error);
      setGraph(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch graph");
    } finally {
      setLoading(false);
    }
  }, [maxNodes, sourceMode]);

  useEffect(() => {
    fetchGraph(300, sourceMode);
  }, []);

  useEffect(() => {
    fetchGraph(maxNodes, sourceMode);
  }, [sourceMode]);

  const options = useMemo(() => {
    const empty = { nodeTypes: [], relations: [], clusters: [], robotTypes: [], organizations: [], platforms: [], countries: [], years: [] as string[] };
    if (!graph) return empty;
    return {
      nodeTypes: unique(graph.nodes.map((node) => node.type)),
      relations: unique(graph.edges.map((edge) => edge.relation)),
      clusters: unique(graph.nodes.map((node) => node.cluster)),
      robotTypes: unique(graph.nodes.map((node) => node.robot_type)),
      organizations: unique(graph.nodes.map((node) => node.organization)),
      platforms: unique(graph.edges.map((edge) => edge.source_platform)),
      countries: unique(graph.nodes.map((node) => node.country)),
      years: unique(graph.edges.map((edge) => edge.published_at ? String(new Date(edge.published_at).getFullYear()) : null))
    };
  }, [graph]);

  const visibleGraph = useMemo(() => {
    if (!graph) return null;
    const filtered = filterGraph(graph, filters, { showLowConfidence, onlyReviewed, showOwned, showMedia, showAcademic });
    return localMode ? localGraph(filtered, selectedNodeId, localDepth) : filtered;
  }, [filters, graph, localDepth, localMode, onlyReviewed, selectedNodeId, showAcademic, showLowConfidence, showMedia, showOwned]);

  const setNodeDetail = useCallback((node: NetworkNode, sourceGraph: NetworkGraph) => {
    const incoming = sourceGraph.edges.filter((edge) => edge.target === node.id);
    const outgoing = sourceGraph.edges.filter((edge) => edge.source === node.id);
    const connectedIds = new Set([...incoming.map((edge) => edge.source), ...outgoing.map((edge) => edge.target)]);
    setDetail({
      kind: "node",
      node,
      incoming,
      outgoing,
      connected: sourceGraph.nodes.filter((item) => connectedIds.has(item.id))
    });
    setSelectedNodeId(node.id);
  }, []);

  const runLayout = useCallback((name: "cose" | "circle" = "cose") => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout({
      name,
      animate: true,
      animationDuration: 450,
      fit: true,
      padding: 42,
      ...(name === "cose" ? {
        idealEdgeLength: 100,
        nodeRepulsion: 8500,
        gravity: 0.18,
        numIter: 900
      } : {})
    } as any).run();
  }, []);

  useEffect(() => {
    if (!containerRef.current || !visibleGraph) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: toElements(visibleGraph),
      layout: { name: "cose", animate: false, fit: true, padding: 42 } as any,
      maxZoom: 3,
      minZoom: 0.08,
      style: networkStyles(showArrows, showLabels),
      wheelSensitivity: 0.18
    });

    cyRef.current = cy;
    if (process.env.NODE_ENV !== "production") {
      (window as any).__networkCy = cy;
    }

    cy.on("mouseover", "node", (event) => {
      const node = event.target as NodeSingular;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded").addClass("highlighted");
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("faded highlighted");
    });

    cy.on("mouseover", "edge", (event) => {
      const edge = event.target as EdgeSingular;
      edge.addClass("highlighted");
      const data = edge.data() as NetworkEdge;
      setTooltip({
        x: event.originalEvent?.clientX ?? 0,
        y: event.originalEvent?.clientY ?? 0,
        edge: data,
        subject: edge.source().data("label"),
        object: edge.target().data("label")
      });
    });

    cy.on("mousemove", "edge", (event) => {
      setTooltip((current) => current ? { ...current, x: event.originalEvent?.clientX ?? current.x, y: event.originalEvent?.clientY ?? current.y } : current);
    });

    cy.on("mouseout", "edge", (event) => {
      (event.target as EdgeSingular).removeClass("highlighted");
      setTooltip(null);
    });

    cy.on("tap", "node", (event) => {
      setNodeDetail((event.target as NodeSingular).data() as NetworkNode, visibleGraph);
    });

    cy.on("tap", "edge", (event) => {
      const edge = event.target as EdgeSingular;
      setDetail({
        kind: "edge",
        edge: edge.data() as NetworkEdge,
        subject: edge.source().data() as NetworkNode,
        object: edge.target().data() as NetworkNode
      });
    });

    return () => {
      cy.destroy();
      if ((window as any).__networkCy === cy) {
        delete (window as any).__networkCy;
      }
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [setNodeDetail, showArrows, showLabels, visibleGraph]);

  const focusSearch = () => {
    const cy = cyRef.current;
    if (!cy || !visibleGraph) return;
    const query = search.trim().toLowerCase();
    const found = visibleGraph.nodes.find((node) => node.label.toLowerCase().includes(query) || node.id.toLowerCase() === query);
    if (!found) return;
    const node = cy.getElementById(found.id);
    cy.elements().unselect();
    node.select();
    cy.animate({ center: { eles: node }, zoom: 1.35 }, { duration: 350 });
    setNodeDetail(found, visibleGraph);
  };

  const pinSelected = () => {
    const cy = cyRef.current;
    if (!cy || !selectedNodeId) return;
    const node = cy.getElementById(selectedNodeId);
    if (!node.length) return;
    if (node.locked()) node.unlock();
    else node.lock();
  };

  const exportJson = () => {
    if (!visibleGraph) return;
    const blob = new Blob([JSON.stringify(visibleGraph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "thailand-humanoid-atlas-visible-network.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadMore = () => {
    const next = Math.min(maxNodes + 300, 1000);
    setMaxNodes(next);
    fetchGraph(next, sourceMode);
  };

  const sourceLabel = {
    database: "Database",
    file: "Import file",
    hybrid: "Hybrid",
    fallback_file: "File fallback"
  }[graph?.meta.resolved_source ?? "file"];

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && focusSearch()} placeholder="Search node label..." />
        </div>
        <select value={sourceMode} onChange={(event) => setSourceMode(event.target.value as typeof sourceMode)} aria-label="Network data source">
          <option value="auto">Auto</option>
          <option value="database">Database</option>
          <option value="file">Import file</option>
          <option value="hybrid">Hybrid</option>
        </select>
        <button type="button" onClick={focusSearch}>Focus</button>
        <button type="button" onClick={() => cyRef.current?.fit(undefined, 42)}>Fit view</button>
        <button type="button" onClick={() => runLayout("cose")}>Reset layout</button>
        <button type="button" className={showArrows ? styles.active : ""} onClick={() => setShowArrows((value) => !value)}>Arrows</button>
        <button type="button" className={showLabels ? styles.active : ""} onClick={() => setShowLabels((value) => !value)}>Relation labels</button>
        <button type="button" className={showLowConfidence ? styles.active : ""} onClick={() => setShowLowConfidence((value) => !value)}>Low confidence</button>
        <button type="button" className={onlyReviewed ? styles.active : ""} onClick={() => setOnlyReviewed((value) => !value)}>Only reviewed</button>
        <button type="button" className={showOwned ? styles.active : ""} onClick={() => setShowOwned((value) => !value)}>Owned layer</button>
        <button type="button" className={showMedia ? styles.active : ""} onClick={() => setShowMedia((value) => !value)}>Media layer</button>
        <button type="button" className={showAcademic ? styles.active : ""} onClick={() => setShowAcademic((value) => !value)}>Research layer</button>
        <button type="button" className={localMode ? styles.active : ""} onClick={() => setLocalMode((value) => !value)}>Local graph</button>
        <select value={localDepth} onChange={(event) => setLocalDepth(Number(event.target.value))} aria-label="Local graph depth">
          <option value={1}>Depth 1</option>
          <option value={2}>Depth 2</option>
          <option value={3}>Depth 3</option>
        </select>
        <button type="button" onClick={() => setLocalMode(false)}>Back to global</button>
        <button type="button" onClick={pinSelected}>Pin selected</button>
        <button type="button" onClick={exportJson}>Export JSON</button>
        {graph?.meta.truncated && <button type="button" onClick={loadMore}>Load more</button>}
      </div>

      {graph && (
        <div className={`${styles.sourceStatus} ${graph.meta.resolved_source === "fallback_file" ? styles.sourceWarning : ""}`}>
          <span>Data source: {sourceLabel}</span>
          <span>{graph.meta.node_count} nodes / {graph.meta.edge_count} edges</span>
          {graph.meta.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      )}

      <div className={styles.networkShell}>
        <aside className={styles.filters} aria-label="Network filters">
          <h2>Filters</h2>
          {[
            ["nodeType", "Node type", options.nodeTypes],
            ["relation", "Relation type", options.relations],
            ["cluster", "Cluster", options.clusters],
            ["robotType", "Robot type", options.robotTypes],
            ["organization", "Organization", options.organizations],
            ["sourcePlatform", "Source platform", options.platforms],
            ["year", "Year", options.years],
            ["country", "Country", options.countries]
          ].map(([key, label, values]) => (
            <div className={styles.filterGroup} key={key as string}>
              <label>{label as string}</label>
              <select value={(filters as any)[key as string]} onChange={(event) => setFilters((current) => ({ ...current, [key as string]: event.target.value }))}>
                <option value={allOption}>All</option>
                {(values as string[]).map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          ))}
          <div className={styles.filterGroup}>
            <label>Confidence range</label>
            <input type="range" min="0" max="1" step="0.05" value={filters.confidenceMin} onChange={(event) => setFilters((current) => ({ ...current, confidenceMin: event.target.value }))} />
            <span className={styles.pill}>Min {Number(filters.confidenceMin).toFixed(2)}</span>
          </div>
          <div className={styles.filterGroup}>
            <label>Public/private visibility</label>
            <select value={filters.visibility} onChange={(event) => setFilters((current) => ({ ...current, visibility: event.target.value }))}>
              <option value={allOption}>All</option>
              <option value="public">Public only</option>
              <option value="private">Private markers</option>
            </select>
          </div>
          <div className={styles.statRow}>
            <span className={styles.pill}>{visibleGraph?.nodes.length ?? 0} nodes</span>
            <span className={styles.pill}>{visibleGraph?.edges.length ?? 0} edges</span>
          </div>
        </aside>

        <section className={styles.canvasPanel}>
          <div ref={containerRef} className={styles.graphCanvas} aria-label="Interactive network graph" />
          {loading && <div className={styles.loading}><CircularProgress aria-label="Loading network graph" color="inherit" /><span>Fetching network relationships...</span></div>}
          {error && <div className={styles.error}><strong>Network graph failed to load.</strong><span>{error}</span></div>}
          {!loading && !error && visibleGraph && visibleGraph.nodes.length === 0 && (
            <div className={styles.empty}>
              <strong>No network relationships have been generated yet.</strong>
              <div>
                <code>python -m openatlas analyze nlp</code>
                <code>python -m openatlas analyze graph</code>
                <code>Add seed relationships in data/seeds/relationships.yaml</code>
                <code>Import thailand_humanoid_atlas_seed_records.json</code>
              </div>
            </div>
          )}
        </section>

        <aside className={styles.details} aria-label="Network detail panel">
          <h2>Details</h2>
          {!detail && <p className={styles.detailBlock}>Click a node or relationship to inspect connected records, evidence, and source URLs.</p>}
          {detail?.kind === "node" && (
            <>
              <h3 className={styles.detailTitle}>{detail.node.label}{detail.node.is_private ? " private" : ""}</h3>
              <div className={styles.detailMeta}>
                <span className={styles.pill}>{detail.node.type}</span>
                <span className={styles.pill}>{detail.node.data_origin.replace("_", " ")}</span>
                <span className={styles.pill}>{detail.node.cluster.replace(/_/g, " ")}</span>
                <span className={styles.pill}>confidence {detail.node.confidence.toFixed(2)}</span>
              </div>
              <div className={styles.detailBlock}><strong>Description</strong>{detail.node.description || "No description."}</div>
              <div className={styles.detailBlock}><strong>Organization</strong>{detail.node.organization || "None"}</div>
              <div className={styles.detailBlock}><strong>Country / robot type</strong>{detail.node.country || "Unknown"} / {detail.node.robot_type || "N/A"}</div>
              <div className={styles.detailBlock}><strong>Source count / connected nodes</strong>{detail.node.source_count} / {detail.connected.length}</div>
              <div className={styles.detailBlock}><strong>Incoming relationships</strong><ul className={styles.detailList}>{detail.incoming.slice(0, 12).map((edge) => <li key={edge.id}>{edge.relation} from {edge.source}</li>)}</ul></div>
              <div className={styles.detailBlock}><strong>Outgoing relationships</strong><ul className={styles.detailList}>{detail.outgoing.slice(0, 12).map((edge) => <li key={edge.id}>{edge.relation} to {edge.target}</li>)}</ul></div>
              <div className={styles.detailBlock}><strong>Evidence / source URL</strong>{detail.node.url ? <a href={detail.node.url} target="_blank" rel="noreferrer">{detail.node.url}</a> : "No public URL."}</div>
              <div className={styles.detailBlock}><strong>Source IDs</strong>{[...detail.node.source_record_ids, ...detail.node.import_record_ids].slice(0, 8).join(", ") || "None"}</div>
              {detail.node.record_id && <a className="button primary" href={`/database?q=${encodeURIComponent(detail.node.label)}`}>Open database record</a>}
            </>
          )}
          {detail?.kind === "edge" && (
            <>
              <h3 className={styles.detailTitle}>{detail.edge.relation}</h3>
              <div className={styles.detailMeta}>
                <span className={styles.pill}>confidence {detail.edge.confidence.toFixed(2)}</span>
                <span className={styles.pill}>weight {detail.edge.weight}</span>
                <span className={styles.pill}>{detail.edge.data_origin.replace("_", " ")}</span>
              </div>
              <div className={styles.detailBlock}><strong>Subject</strong>{detail.subject?.label ?? detail.edge.source}</div>
              <div className={styles.detailBlock}><strong>Relation</strong>{detail.edge.relation}</div>
              <div className={styles.detailBlock}><strong>Object</strong>{detail.object?.label ?? detail.edge.target}</div>
              <div className={styles.detailBlock}><strong>Direction</strong>{detail.edge.source} {"->"} {detail.edge.target}</div>
              <div className={styles.detailBlock}><strong>Evidence excerpt</strong>{detail.edge.evidence_excerpt || "No excerpt."}</div>
              <div className={styles.detailBlock}><strong>Source platform / date</strong>{detail.edge.source_platform || "N/A"} / {detail.edge.published_at ? new Date(detail.edge.published_at).toLocaleDateString() : "N/A"}</div>
              <div className={styles.detailBlock}><strong>Review status</strong>{detail.edge.review_status || (detail.edge.is_low_confidence ? "Low-confidence inferred" : "Reviewed or high-confidence")}</div>
              <div className={styles.detailBlock}><strong>Source URL</strong>{detail.edge.url ? <a href={detail.edge.url} target="_blank" rel="noreferrer">{detail.edge.url}</a> : "Generated internally."}</div>
            </>
          )}
        </aside>
      </div>

      {tooltip && (
        <div className={styles.tooltip} style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <strong>{tooltip.subject} {"->"} {tooltip.object}</strong>
          <div>{tooltip.edge.relation} · confidence {tooltip.edge.confidence.toFixed(2)}</div>
          <div>{tooltip.edge.evidence_excerpt?.slice(0, 160) || tooltip.edge.description}</div>
        </div>
      )}
    </>
  );
}
