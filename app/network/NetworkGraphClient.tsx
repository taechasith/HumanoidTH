"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import cytoscape, { Core, EdgeSingular, ElementDefinition, NodeSingular } from "cytoscape";
import CircularProgress from "@mui/material/CircularProgress";
import { edgeColorLegend, networkStyles } from "./cytoscapeStyles";
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
type LabelMode = "off" | "hover" | "selected" | "important" | "all";
type DensityMode = "compact" | "balanced" | "spacious";

const labelModeOptions: Array<{ value: LabelMode; label: string }> = [
  { value: "off", label: "Off" },
  { value: "hover", label: "Hover" },
  { value: "selected", label: "Selected" },
  { value: "important", label: "Important only" },
  { value: "all", label: "All" }
];

const edgeLegendText: Record<"en" | "th", Record<string, string>> = {
  en: {
    development: "Development / creation",
    ownership: "Ownership / initiation",
    operations: "Operation",
    collaboration: "Collaboration",
    connection: "Connection",
    association: "Related record",
    placement: "Deployment / location",
    showcase: "Showcase / event",
    publication: "Publication / author",
    classification: "Category / instance",
    theme: "Theme",
    reference: "Mention / discussion"
  },
  th: {
    development: "พัฒนา / สร้าง",
    ownership: "เป็นเจ้าของ / ริเริ่ม",
    operations: "ดำเนินงาน",
    collaboration: "ร่วมมือ",
    connection: "เชื่อมต่อ",
    association: "ข้อมูลที่เกี่ยวข้อง",
    placement: "การใช้งาน / สถานที่",
    showcase: "จัดแสดง / กิจกรรม",
    publication: "เผยแพร่ / ผู้เขียน",
    classification: "หมวดหมู่ / ตัวอย่าง",
    theme: "หัวข้อ",
    reference: "กล่าวถึง / อภิปราย"
  }
};

const densitySettings: Record<DensityMode, { label: string; idealEdgeLength: number; nodeRepulsion: number; gravity: number; edgeElasticity: number; componentSpacing: number; spacingFactor: number; padding: number; zoom: number; minNodeSpacing: number }> = {
  compact: { label: "Compact", idealEdgeLength: 180, nodeRepulsion: 24000, gravity: 0.16, edgeElasticity: 64, componentSpacing: 180, spacingFactor: 1.9, padding: 84, zoom: 0.94, minNodeSpacing: 48 },
  balanced: { label: "Balanced", idealEdgeLength: 285, nodeRepulsion: 56000, gravity: 0.08, edgeElasticity: 36, componentSpacing: 300, spacingFactor: 2.9, padding: 96, zoom: 0.94, minNodeSpacing: 72 },
  spacious: { label: "Spacious", idealEdgeLength: 420, nodeRepulsion: 98000, gravity: 0.035, edgeElasticity: 20, componentSpacing: 440, spacingFactor: 4.1, padding: 112, zoom: 0.95, minNodeSpacing: 108 }
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b));
}

const localT = {
  en: {
    searchPlaceholder: "Search node label...",
    focus: "Focus",
    fitView: "Fit view",
    resetLayout: "Reset layout",
    labelDisplay: "Name tags",
    density: "Density",
    animation: "Animation",
    focusMode: "Focus mode",
    collapseFilters: "Hide filters",
    collapseDetails: "Hide details",
    showFilters: "Show filters",
    showDetails: "Show details",
    arrows: "Arrows",
    relationLabels: "Relation labels",
    lowConfidence: "Low confidence",
    onlyReviewed: "Only reviewed",
    ownedLayer: "Owned layer",
    mediaLayer: "Media layer",
    researchLayer: "Research layer",
    localGraph: "Local graph",
    backToGlobal: "Back to global",
    pinSelected: "Pin selected",
    exportJson: "Export JSON",
    loadMore: "Load more",
    dataSource: "Data source:",
    filtersHeader: "Filters",
    detailsHeader: "Details",
    defaultDetailText: "Click a node or relationship to inspect connected records, source text, and URLs.",
    descLabel: "Description",
    orgLabel: "Organization",
    countryTypeLabel: "Country / robot type",
    sourceConnectedLabel: "Source count / connected nodes",
    incomingLabel: "Incoming relationships",
    outgoingLabel: "Outgoing relationships",
    evidenceUrlLabel: "Source URL",
    sourceIdsLabel: "Source IDs",
    openRecordBtn: "Open database record",
    subjectLabel: "Subject",
    relationLabel: "Relation",
    objectLabel: "Object",
    directionLabel: "Direction",
    excerptLabel: "Source excerpt",
    sourcePlatformDate: "Source platform / date",
    reviewStatusLabel: "Review status",
    noPublicUrl: "No public URL.",
    generatedInternally: "Generated internally.",
    none: "None",
    fetchingGraph: "Fetching network relationships...",
    graphFailedLoad: "Network graph failed to load.",
    noRelationships: "No network relationships have been generated yet.",
    depth: "Depth",
    sourceWarning: "Using local JSON cache fallback"
  },
  th: {
    searchPlaceholder: "ค้นหาโหนด...",
    focus: "โฟกัส",
    fitView: "จัดพอดีจอ",
    resetLayout: "จัดตำแหน่งใหม่",
    labelDisplay: "ป้ายชื่อข้อมูล",
    density: "ความหนาแน่น",
    animation: "แอนิเมชัน",
    focusMode: "โหมดโฟกัส",
    collapseFilters: "ซ่อนตัวกรอง",
    collapseDetails: "ซ่อนรายละเอียด",
    showFilters: "แสดงตัวกรอง",
    showDetails: "แสดงรายละเอียด",
    arrows: "ลูกศรทิศทาง",
    relationLabels: "ป้ายความสัมพันธ์",
    lowConfidence: "ความน่าเชื่อถือต่ำ",
    onlyReviewed: "เฉพาะที่ตรวจสอบแล้ว",
    ownedLayer: "เลเยอร์คลังอุปกรณ์",
    mediaLayer: "เลเยอร์สื่อประชาสัมพันธ์",
    researchLayer: "เลเยอร์งานวิจัย",
    localGraph: "กราฟเฉพาะส่วน",
    backToGlobal: "กลับหน้าหลัก",
    pinSelected: "ปักหมุดโหนด",
    exportJson: "ส่งออก JSON",
    loadMore: "โหลดเพิ่ม",
    dataSource: "แหล่งข้อมูล:",
    filtersHeader: "ตัวกรองข้อมูล",
    detailsHeader: "รายละเอียด",
    defaultDetailText: "คลิกที่โหนดหรือความสัมพันธ์เพื่อตรวจสอบบันทึกการเชื่อมต่อ แหล่งอ้างอิง และลิงก์ต้นทาง",
    descLabel: "คำอธิบาย",
    orgLabel: "หน่วยงาน / สังกัด",
    countryTypeLabel: "ประเทศ / ประเภทหุ่นยนต์",
    sourceConnectedLabel: "จำนวนแหล่งข้อมูล / โหนดที่เชื่อมต่อ",
    incomingLabel: "ความสัมพันธ์ขาเข้า",
    outgoingLabel: "ความสัมพันธ์ขาออก",
    evidenceUrlLabel: "ลิงก์แหล่งที่มา",
    sourceIdsLabel: "ไอดีแหล่งข้อมูล",
    openRecordBtn: "เปิดประวัติตารางดิบ",
    subjectLabel: "ประธาน (Subject)",
    relationLabel: "ความสัมพันธ์ (Relation)",
    objectLabel: "กรรม (Object)",
    directionLabel: "ทิศทาง",
    excerptLabel: "ข้อความอ้างอิงต้นฉบับ",
    sourcePlatformDate: "แพลตฟอร์มแหล่งที่มา / วันที่เผยแพร่",
    reviewStatusLabel: "สถานะการตรวจสอบ",
    noPublicUrl: "ไม่มีลิงก์สาธารณะ",
    generatedInternally: "สร้างโดยระบบภายใน",
    none: "ไม่มีข้อมูล",
    fetchingGraph: "กำลังดึงข้อมูลความสัมพันธ์...",
    graphFailedLoad: "ไม่สามารถโหลดกราฟความสัมพันธ์ได้",
    noRelationships: "ยังไม่มีการสร้างความสัมพันธ์ในระบบ",
    depth: "ความลึกระดับ",
    sourceWarning: "กำลังใช้งานไฟล์แคชสำรองในเครื่อง"
  }
};

function isImportantNode(node: NetworkNode) {
  return node.degree >= 5
    || node.source_count >= 3
    || (node.confidence >= 0.9 && ["robot_model", "organization", "institution", "contribution"].includes(node.type));
}

function isMinorNode(node: NetworkNode) {
  return !isImportantNode(node) && node.degree <= 1 && node.source_count <= 1;
}

function keyNodeIds(nodes: NetworkNode[], limit = 14) {
  return new Set([...nodes]
    .sort((left, right) => ((right.degree * 4) + (right.source_count * 3) + right.confidence) - ((left.degree * 4) + (left.source_count * 3) + left.confidence))
    .slice(0, limit)
    .map((node) => node.id));
}

function truncateLabel(label: string) {
  return label.length > 34 ? `${label.slice(0, 31)}...` : label;
}

function labelModeText(mode: LabelMode, lang: "en" | "th") {
  if (lang === "th") {
    if (mode === "off") return "ปิด";
    if (mode === "hover") return "ชี้เมาส์";
    if (mode === "selected") return "เลือก";
    if (mode === "important") return "สำคัญ";
    return "ทั้งหมด";
  }
  return labelModeOptions.find((option) => option.value === mode)?.label ?? mode;
}

function densityText(mode: DensityMode, lang: "en" | "th") {
  if (lang === "th") {
    if (mode === "compact") return "กะทัดรัด";
    if (mode === "balanced") return "โปร่ง";
    return "โปร่งมาก";
  }
  return densitySettings[mode].label;
}

function toElements(graph: NetworkGraph): ElementDefinition[] {
  const minorNodeIds = new Set(graph.nodes.filter(isMinorNode).map((node) => node.id));
  const keyNodes = keyNodeIds(graph.nodes);
  return [
    ...graph.nodes.map((node) => ({
      data: { ...node, displayLabel: truncateLabel(node.label), important: keyNodes.has(node.id) },
      classes: `${node.type} ${node.cluster} ${keyNodes.has(node.id) ? "important" : ""} ${isMinorNode(node) ? "minor" : ""} ${node.is_private ? "private" : ""} ${node.is_low_confidence ? "low-confidence" : ""}`
    })),
    ...graph.edges.map((edge) => ({
      data: edge,
      classes: `${edge.relation} ${minorNodeIds.has(edge.source) || minorNodeIds.has(edge.target) ? "minor-link" : ""} ${edge.is_low_confidence ? "low-confidence" : ""}`
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

function primaryGraph(graph: NetworkGraph): NetworkGraph {
  const primaryNodeIds = keyNodeIds(graph.nodes, 24);
  const edges = graph.edges.filter((edge) => primaryNodeIds.has(edge.source) && primaryNodeIds.has(edge.target));
  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  const nodes = graph.nodes.filter((node) => primaryNodeIds.has(node.id) && connectedNodeIds.has(node.id));
  return {
    ...graph,
    nodes,
    edges,
    meta: { ...graph.meta, node_count: nodes.length, edge_count: edges.length }
  };
}

function updateLabelClasses(cy: Core, labelMode: LabelMode, selectedNodeId: string | null) {
  cy.nodes().removeClass("show-label");
  if (labelMode === "off") return;
  if (labelMode === "all") {
    cy.nodes().addClass("show-label");
    return;
  }
  if (labelMode === "important") {
    cy.nodes(".important").addClass("show-label");
    return;
  }
  if (labelMode === "selected" && selectedNodeId) {
    const selected = cy.getElementById(selectedNodeId);
    if (selected.length) selected.closedNeighborhood("node").addClass("show-label");
  }
}

export default function NetworkGraphClient({ lang = "en" }: { lang?: "en" | "th" }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const labelModeRef = useRef<LabelMode>("important");
  const selectedNodeIdRef = useRef<string | null>(null);
  const [graph, setGraph] = useState<NetworkGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; edge: NetworkEdge; subject?: string; object?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [maxNodes, setMaxNodes] = useState(240);
  const [sourceMode, setSourceMode] = useState<"auto" | "file" | "database" | "hybrid">("auto");
  const [showArrows, setShowArrows] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [labelMode, setLabelMode] = useState<LabelMode>("important");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [densityMode, setDensityMode] = useState<DensityMode>("spacious");
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [showLowConfidence, setShowLowConfidence] = useState(true);
  const [onlyReviewed, setOnlyReviewed] = useState(false);
  const [showOwned, setShowOwned] = useState(true);
  const [showMedia, setShowMedia] = useState(true);
  const [showAcademic, setShowAcademic] = useState(true);
  const [showPeripheralNodes, setShowPeripheralNodes] = useState(false);
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

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(motionQuery.matches);
    syncMotion();
    motionQuery.addEventListener("change", syncMotion);
    try {
      const savedAnimations = localStorage.getItem("network.animationsEnabled");
      const savedFiltersCollapsed = localStorage.getItem("network.filtersCollapsed");
      const savedDetailsCollapsed = localStorage.getItem("network.detailsCollapsed");
      if (savedAnimations !== null) setAnimationsEnabled(savedAnimations === "true");
      if (savedFiltersCollapsed !== null) setFiltersCollapsed(savedFiltersCollapsed === "true");
      if (savedDetailsCollapsed !== null) setDetailsCollapsed(savedDetailsCollapsed === "true");
    } catch {
      // Ignore blocked storage; graph preferences are optional.
    }
    return () => motionQuery.removeEventListener("change", syncMotion);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("network.animationsEnabled", String(animationsEnabled));
      localStorage.setItem("network.filtersCollapsed", String(filtersCollapsed));
      localStorage.setItem("network.detailsCollapsed", String(detailsCollapsed));
    } catch {
      // Ignore blocked storage.
    }
  }, [animationsEnabled, detailsCollapsed, filtersCollapsed]);

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
    fetchGraph(240, sourceMode);
  }, []);

  useEffect(() => {
    labelModeRef.current = labelMode;
    selectedNodeIdRef.current = selectedNodeId;
    const cy = cyRef.current;
    if (cy) updateLabelClasses(cy, labelMode, selectedNodeId);
  }, [labelMode, selectedNodeId]);

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

  const filteredGraph = useMemo(() => {
    if (!graph) return null;
    const filtered = filterGraph(graph, filters, { showLowConfidence, onlyReviewed, showOwned, showMedia, showAcademic });
    return localMode ? localGraph(filtered, selectedNodeId, localDepth) : filtered;
  }, [filters, graph, localDepth, localMode, onlyReviewed, selectedNodeId, showAcademic, showLowConfidence, showMedia, showOwned]);

  const visibleGraph = useMemo(() => {
    if (!filteredGraph || showPeripheralNodes) return filteredGraph;
    return primaryGraph(filteredGraph);
  }, [filteredGraph, showPeripheralNodes]);

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

  const motionEnabled = animationsEnabled && !reducedMotion;
  const density = densitySettings[densityMode];

  const pulseNode = useCallback((node: NodeSingular) => {
    if (!motionEnabled) return;
    node.addClass("pulse");
    window.setTimeout(() => node.removeClass("pulse"), 360);
  }, [motionEnabled]);

  const runLayout = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout({
      name: "breadthfirst",
      animate: false,
      animationDuration: 0,
      avoidOverlap: true,
      circle: false,
      directed: true,
      fit: true,
      grid: true,
      nodeDimensionsIncludeLabels: true,
      padding: density.padding,
      spacingFactor: density.minNodeSpacing / 44
    } as any).run();
  }, [density]);

  useEffect(() => {
    if (!containerRef.current || !visibleGraph) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: toElements(visibleGraph),
      layout: {
        name: "breadthfirst",
        animate: false,
        animationDuration: 0,
        avoidOverlap: true,
        circle: false,
        directed: true,
        fit: true,
        grid: true,
        nodeDimensionsIncludeLabels: true,
        padding: density.padding,
        spacingFactor: density.minNodeSpacing / 44
      } as any,
      maxZoom: 3,
      minZoom: 0.08,
      style: networkStyles(showArrows, showLabels, motionEnabled),
      wheelSensitivity: 0.18
    });

    cyRef.current = cy;
    updateLabelClasses(cy, labelModeRef.current, selectedNodeIdRef.current);
    cy.ready(() => {
      cy.fit(undefined, density.padding);
      cy.zoom(Math.max(cy.minZoom(), cy.zoom() * density.zoom));
      if (motionEnabled) {
        cy.nodes(".important").slice(0, 18).forEach((node, index) => {
          window.setTimeout(() => pulseNode(node as NodeSingular), index * 28);
        });
      }
    });
    if (process.env.NODE_ENV !== "production") {
      (window as any).__networkCy = cy;
    }

    cy.on("mouseover", "node", (event) => {
      const node = event.target as NodeSingular;
      const neighborhood = node.closedNeighborhood();
      cy.elements().addClass("faded");
      neighborhood.removeClass("faded").addClass("highlighted");
      if (labelModeRef.current === "hover") {
        cy.nodes().removeClass("show-label");
        neighborhood.nodes().addClass("show-label");
      }
      pulseNode(node);
    });

    cy.on("mouseout", "node", () => {
      cy.elements().removeClass("faded highlighted");
      updateLabelClasses(cy, labelModeRef.current, selectedNodeIdRef.current);
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
      const node = event.target as NodeSingular;
      setNodeDetail(node.data() as NetworkNode, visibleGraph);
      if (labelModeRef.current === "selected") node.closedNeighborhood("node").addClass("show-label");
      pulseNode(node);
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

    cy.on("grab", "node", (event) => {
      const node = event.target as NodeSingular;
      node.addClass("is-dragging show-label");
      node.connectedEdges().addClass("highlighted");
      node.closedNeighborhood().removeClass("faded").addClass("highlighted");
    });

    cy.on("drag", "node", (event) => {
      const node = event.target as NodeSingular;
      cy.elements().addClass("faded");
      node.closedNeighborhood().removeClass("faded").addClass("highlighted");
    });

    cy.on("free", "node", (event) => {
      const node = event.target as NodeSingular;
      node.removeClass("is-dragging");
      node.addClass("just-dropped");
      node.position(node.position());
      cy.elements().removeClass("faded highlighted");
      selectedNodeIdRef.current = node.id();
      updateLabelClasses(cy, labelModeRef.current, node.id());
      window.setTimeout(() => node.removeClass("just-dropped"), motionEnabled ? 420 : 0);
    });

    return () => {
      cy.destroy();
      if ((window as any).__networkCy === cy) {
        delete (window as any).__networkCy;
      }
      if (cyRef.current === cy) cyRef.current = null;
    };
  }, [density, motionEnabled, pulseNode, setNodeDetail, showArrows, showLabels, visibleGraph]);

  const focusSearch = () => {
    const cy = cyRef.current;
    if (!cy || !visibleGraph) return;
    const query = search.trim().toLowerCase();
    const found = visibleGraph.nodes.find((node) => node.label.toLowerCase().includes(query) || node.id.toLowerCase() === query);
    if (!found) return;
    const node = cy.getElementById(found.id);
    cy.elements().unselect();
    node.select();
    node.addClass("show-label pulse");
    cy.animate({ center: { eles: node }, zoom: Math.min(1.35, cy.maxZoom()) }, { duration: motionEnabled ? 380 : 0, easing: "ease-out" });
    window.setTimeout(() => {
      node.removeClass("pulse");
      updateLabelClasses(cy, labelModeRef.current, found.id);
    }, motionEnabled ? 520 : 0);
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
        <div className={styles.toolbarPrimary}>
          <div className={styles.searchWrap}>
            <input aria-label={localT[lang].searchPlaceholder} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && focusSearch()} placeholder={localT[lang].searchPlaceholder} />
          </div>
          <button type="button" className={styles.primaryAction} onClick={focusSearch}>{localT[lang].focus}</button>
          <div className={styles.actionGroup} aria-label={lang === "th" ? "ควบคุมมุมมองกราฟ" : "Graph viewport controls"}>
            <button type="button" onClick={() => cyRef.current?.fit(undefined, density.padding)}>{localT[lang].fitView}</button>
            <button type="button" onClick={runLayout}>{localT[lang].resetLayout}</button>
          </div>
        </div>

        <div className={styles.toolbarSecondary}>
          <label className={styles.compactSelect}>
            <span>{localT[lang].labelDisplay}</span>
            <select autoComplete="off" value={labelMode} onChange={(event) => setLabelMode(event.target.value as LabelMode)} aria-label="Label display">
              {labelModeOptions.map((option) => <option key={option.value} value={option.value}>{labelModeText(option.value, lang)}</option>)}
            </select>
          </label>
          <label className={styles.compactSelect}>
            <span>{localT[lang].density}</span>
            <select autoComplete="off" value={densityMode} onChange={(event) => setDensityMode(event.target.value as DensityMode)} aria-label="Graph density">
              {(Object.keys(densitySettings) as DensityMode[]).map((key) => <option key={key} value={key}>{densityText(key, lang)}</option>)}
            </select>
          </label>
          <button type="button" className={focusMode ? styles.active : ""} onClick={() => setFocusMode((value) => !value)}>{localT[lang].focusMode}</button>
          <button type="button" className={!filtersCollapsed ? styles.active : ""} onClick={() => setFiltersCollapsed((value) => !value)}>{filtersCollapsed ? localT[lang].showFilters : localT[lang].collapseFilters}</button>
          <button type="button" className={!detailsCollapsed ? styles.active : ""} onClick={() => setDetailsCollapsed((value) => !value)}>{detailsCollapsed ? localT[lang].showDetails : localT[lang].collapseDetails}</button>
          <details className={styles.advancedControls}>
            <summary>{lang === "th" ? "ตัวเลือกเพิ่มเติม" : "More controls"}</summary>
            <div className={styles.advancedMenu}>
              <label className={styles.inlineControl}>
                {localT[lang].dataSource}
                <select value={sourceMode} onChange={(event) => setSourceMode(event.target.value as typeof sourceMode)} aria-label="Network data source">
                  <option value="auto">{lang === "th" ? "อัตโนมัติ" : "Auto"}</option>
                  <option value="database">{lang === "th" ? "ฐานข้อมูล" : "Database"}</option>
                  <option value="file">{lang === "th" ? "ไฟล์นำเข้า" : "Import file"}</option>
                  <option value="hybrid">{lang === "th" ? "ไฮบริด" : "Hybrid"}</option>
                </select>
              </label>
              <button type="button" className={animationsEnabled ? styles.active : ""} onClick={() => setAnimationsEnabled((value) => !value)}>{localT[lang].animation}</button>
              <button type="button" className={showArrows ? styles.active : ""} onClick={() => setShowArrows((value) => !value)}>{localT[lang].arrows}</button>
              <button type="button" className={showLabels ? styles.active : ""} onClick={() => setShowLabels((value) => !value)}>{localT[lang].relationLabels}</button>
              <button type="button" className={showLowConfidence ? styles.active : ""} onClick={() => setShowLowConfidence((value) => !value)}>{localT[lang].lowConfidence}</button>
              <button type="button" className={onlyReviewed ? styles.active : ""} onClick={() => setOnlyReviewed((value) => !value)}>{localT[lang].onlyReviewed}</button>
              <button type="button" className={showOwned ? styles.active : ""} onClick={() => setShowOwned((value) => !value)}>{localT[lang].ownedLayer}</button>
              <button type="button" className={showMedia ? styles.active : ""} onClick={() => setShowMedia((value) => !value)}>{localT[lang].mediaLayer}</button>
              <button type="button" className={showAcademic ? styles.active : ""} onClick={() => setShowAcademic((value) => !value)}>{localT[lang].researchLayer}</button>
              <button type="button" className={showPeripheralNodes ? styles.active : ""} onClick={() => setShowPeripheralNodes((value) => !value)}>{lang === "th" ? "โหนดปลายทาง" : "Peripheral nodes"}</button>
              <button type="button" className={localMode ? styles.active : ""} onClick={() => setLocalMode((value) => !value)}>{localT[lang].localGraph}</button>
              <label className={styles.inlineControl}>
                {localT[lang].depth}
                <select value={localDepth} onChange={(event) => setLocalDepth(Number(event.target.value))} aria-label="Local graph depth">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
              </label>
              <button type="button" onClick={() => setLocalMode(false)}>{localT[lang].backToGlobal}</button>
              <button type="button" onClick={pinSelected}>{localT[lang].pinSelected}</button>
              <button type="button" onClick={exportJson}>{localT[lang].exportJson}</button>
              {graph?.meta.truncated && <button type="button" onClick={loadMore}>{localT[lang].loadMore}</button>}
            </div>
          </details>
        </div>
      </div>

      {graph && (
        <div className={`${styles.sourceStatus} ${graph.meta.resolved_source === "fallback_file" ? styles.sourceWarning : ""}`}>
          <span>{localT[lang].dataSource} {graph.meta.resolved_source === "fallback_file" ? localT[lang].sourceWarning : sourceLabel}</span>
          <span>{lang === "th" ? `แสดง ${visibleGraph?.nodes.length ?? 0} จาก ${graph.meta.node_count} โหนด` : `Showing ${visibleGraph?.nodes.length ?? 0} of ${graph.meta.node_count} nodes`} / {visibleGraph?.edges.length ?? 0} {lang === "th" ? "เส้นเชื่อม" : "edges"}</span>
          <details className={styles.edgeLegend}>
            <summary>{lang === "th" ? "ความหมายสีเส้น" : "Edge color key"}</summary>
            <div className={styles.edgeLegendMenu}>
              {edgeColorLegend.map((item) => (
                <span className={styles.edgeLegendItem} key={item.key}>
                  <i className={styles.edgeLegendSwatch} style={{ backgroundColor: item.color }} aria-hidden="true" />
                  {edgeLegendText[lang][item.key]}
                </span>
              ))}
              <span className={styles.edgeLegendNote}>
                <i className={styles.lowConfidenceSwatch} aria-hidden="true" />
                {lang === "th" ? "เส้นประสีเหลือง = ข้อมูลความมั่นใจต่ำ" : "Yellow dashed = low-confidence data"}
              </span>
            </div>
          </details>
          {graph.meta.warnings.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      )}

      <div className={`${styles.networkShell} ${filtersCollapsed || focusMode ? styles.filtersCollapsed : ""} ${detailsCollapsed || focusMode ? styles.detailsCollapsed : ""} ${focusMode ? styles.focusMode : ""}`}>
        {!(filtersCollapsed || focusMode) && <aside className={styles.filters} aria-label="Network filters">
          <h2>{localT[lang].filtersHeader}</h2>
          {[
            ["nodeType", lang === "th" ? "ประเภทโหนด" : "Node type", options.nodeTypes],
            ["relation", lang === "th" ? "ประเภทความสัมพันธ์" : "Relation type", options.relations],
            ["cluster", lang === "th" ? "กลุ่มคลัสเตอร์" : "Cluster", options.clusters],
            ["robotType", lang === "th" ? "ประเภทหุ่นยนต์" : "Robot type", options.robotTypes],
            ["organization", lang === "th" ? "หน่วยงาน / สังกัด" : "Organization", options.organizations],
            ["sourcePlatform", lang === "th" ? "แพลตฟอร์มแหล่งที่มา" : "Source platform", options.platforms],
            ["year", lang === "th" ? "ปีที่เผยแพร่" : "Year", options.years],
            ["country", lang === "th" ? "ประเทศแหล่งกำเนิด" : "Country", options.countries]
          ].map(([key, label, values]) => (
            <div className={styles.filterGroup} key={key as string}>
              <label>{label as string}</label>
              <select value={(filters as any)[key as string]} onChange={(event) => setFilters((current) => ({ ...current, [key as string]: event.target.value }))}>
                <option value={allOption}>{lang === "th" ? "ทั้งหมด" : "All"}</option>
                {(values as string[]).map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          ))}
          <div className={styles.filterGroup}>
            <label>{lang === "th" ? "ระดับความมั่นใจขั้นต่ำ" : "Confidence range"}</label>
            <input type="range" min="0" max="1" step="0.05" value={filters.confidenceMin} onChange={(event) => setFilters((current) => ({ ...current, confidenceMin: event.target.value }))} />
            <span className={styles.pill}>{lang === "th" ? "ขั้นต่ำ" : "Min"} {Number(filters.confidenceMin).toFixed(2)}</span>
          </div>
          <div className={styles.filterGroup}>
            <label>{lang === "th" ? "การมองเห็นข้อมูลภายนอก/ภายใน" : "Public/private visibility"}</label>
            <select value={filters.visibility} onChange={(event) => setFilters((current) => ({ ...current, visibility: event.target.value }))}>
              <option value={allOption}>{lang === "th" ? "ทั้งหมด" : "All"}</option>
              <option value="public">{lang === "th" ? "เฉพาะสาธารณะ" : "Public only"}</option>
              <option value="private">{lang === "th" ? "ข้อมูลภายใน/ส่วนตัว" : "Private markers"}</option>
            </select>
          </div>
          <div className={styles.statRow}>
            <span className={styles.pill}>{visibleGraph?.nodes.length ?? 0} {lang === "th" ? "โหนด" : "nodes"}</span>
            <span className={styles.pill}>{visibleGraph?.edges.length ?? 0} {lang === "th" ? "เส้นเชื่อม" : "edges"}</span>
          </div>
        </aside>}

        <section className={styles.canvasPanel}>
          <div ref={containerRef} className={styles.graphCanvas} aria-label="Interactive network graph" />
          {loading && <div className={styles.loading}><CircularProgress aria-label="Loading network graph" color="inherit" /><span>{localT[lang].fetchingGraph}</span></div>}
          {error && <div className={styles.error}><strong>{localT[lang].graphFailedLoad}</strong><span>{error}</span></div>}
          {!loading && !error && visibleGraph && visibleGraph.nodes.length === 0 && (
            <div className={styles.empty}>
              <strong>{localT[lang].noRelationships}</strong>
              <div>
                <code>python -m openatlas analyze nlp</code>
                <code>python -m openatlas analyze graph</code>
                <code>Add seed relationships in data/seeds/relationships.yaml</code>
                <code>Import thailand_humanoid_atlas_seed_records.json</code>
              </div>
            </div>
          )}
        </section>

        {!(detailsCollapsed || focusMode) && <aside className={styles.details} aria-label="Network detail panel">
          <h2>{localT[lang].detailsHeader}</h2>
          {!detail && <p className={styles.detailBlock}>{localT[lang].defaultDetailText}</p>}
          {detail?.kind === "node" && (
            <>
              <h3 className={styles.detailTitle}>{detail.node.label}{detail.node.is_private ? (lang === "th" ? " (ส่วนตัว)" : " (private)") : ""}</h3>
              <div className={styles.detailMeta}>
                <span className={styles.pill}>{detail.node.type}</span>
                <span className={styles.pill}>{detail.node.data_origin.replace("_", " ")}</span>
                <span className={styles.pill}>{detail.node.cluster.replace(/_/g, " ")}</span>
                <span className={styles.pill}>confidence {detail.node.confidence.toFixed(2)}</span>
              </div>
              <div className={styles.detailBlock}><strong>{localT[lang].descLabel}</strong>{detail.node.description || (lang === "th" ? "ไม่มีคำอธิบาย" : "No description.")}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].orgLabel}</strong>{detail.node.organization || localT[lang].none}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].countryTypeLabel}</strong>{detail.node.country || (lang === "th" ? "ไม่ระบุประเทศ" : "Unknown")} / {detail.node.robot_type || "N/A"}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].sourceConnectedLabel}</strong>{detail.node.source_count} / {detail.connected.length}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].incomingLabel}</strong><ul className={styles.detailList}>{detail.incoming.slice(0, 12).map((edge) => <li key={edge.id}>{edge.relation} from {edge.source}</li>)}</ul></div>
              <div className={styles.detailBlock}><strong>{localT[lang].outgoingLabel}</strong><ul className={styles.detailList}>{detail.outgoing.slice(0, 12).map((edge) => <li key={edge.id}>{edge.relation} to {edge.target}</li>)}</ul></div>
              <div className={styles.detailBlock}><strong>{localT[lang].evidenceUrlLabel}</strong>{detail.node.url ? <a href={detail.node.url} target="_blank" rel="noreferrer">{detail.node.url}</a> : localT[lang].noPublicUrl}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].sourceIdsLabel}</strong>{[...detail.node.source_record_ids, ...detail.node.import_record_ids].slice(0, 8).join(", ") || localT[lang].none}</div>
              {detail.node.record_id && <a className="button primary" href={`/database?q=${encodeURIComponent(detail.node.label)}`}>{localT[lang].openRecordBtn}</a>}
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
              <div className={styles.detailBlock}><strong>{localT[lang].subjectLabel}</strong>{detail.subject?.label ?? detail.edge.source}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].relationLabel}</strong>{detail.edge.relation}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].objectLabel}</strong>{detail.object?.label ?? detail.edge.target}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].directionLabel}</strong>{detail.edge.source} {"->"} {detail.edge.target}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].excerptLabel}</strong>{detail.edge.evidence_excerpt || (lang === "th" ? "ไม่มีข้อความอ้างอิง" : "No excerpt.")}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].sourcePlatformDate}</strong>{detail.edge.source_platform || "N/A"} / {detail.edge.published_at ? new Date(detail.edge.published_at).toLocaleDateString() : "N/A"}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].reviewStatusLabel}</strong>{detail.edge.review_status || (detail.edge.is_low_confidence ? (lang === "th" ? "ประเมินโดยระบบอัตโนมัติ (ความมั่นใจต่ำ)" : "Low-confidence inferred") : (lang === "th" ? "ตรวจสอบแล้วหรือมีความมั่นใจสูง" : "Reviewed or high-confidence"))}</div>
              <div className={styles.detailBlock}><strong>{localT[lang].evidenceUrlLabel}</strong>{detail.edge.url ? <a href={detail.edge.url} target="_blank" rel="noreferrer">{detail.edge.url}</a> : localT[lang].generatedInternally}</div>
            </>
          )}
        </aside>}
      </div>

      {tooltip && (
        <div className={styles.tooltip} style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}>
          <strong>{tooltip.subject} {"->"} {tooltip.object}</strong>
          <div>{tooltip.edge.relation} · confidence {tooltip.edge.confidence.toFixed(2)}</div>
          <div>{tooltip.edge.evidence_excerpt?.slice(0, 160) || tooltip.edge.description}</div>
          {tooltip.edge.url && <div><a href={tooltip.edge.url} target="_blank" rel="noreferrer">{lang === "th" ? "ลิงก์แหล่งที่มา" : "Source URL"}</a></div>}
        </div>
      )}
    </>
  );
}
