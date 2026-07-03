"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { getTranslation } from "@/lib/translations";
import Link from "next/link";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RefreshCw, 
  Search, 
  Eye, 
  EyeOff, 
  Pin, 
  HelpCircle,
  X,
  Copy,
  FolderOpen
} from "lucide-react";

// Dynamically load cytoscape to avoid SSR issues
let cytoscape: any;

interface NetworkGraphClientProps {
  triplets: any[];
  robots: any[];
  inventory: any[];
  contributions: any[];
  currentLang?: "en" | "th";
}

const getGraphFolderForNodeType = (type: string) => {
  switch (type) {
    case "robot":
      return "robots";
    case "owned_inventory":
      return "inventory";
    case "person":
      return "people";
    case "organization":
    case "company":
    case "university_lab":
      return "organizations";
    case "contribution":
      return "contributions";
    case "theme":
      return "themes";
    case "media_source":
      return "sources";
    case "paper":
      return "papers";
    case "event":
      return "events";
    case "place":
      return "places";
    default:
      return "concepts";
  }
};

const normalizeGraphPathBase = (basePath: string) => {
  return basePath.trim().replace(/[\\/]+$/, "");
};

const createGraphFilePath = (node: any, basePath: string) => {
  const label = String(node.label || node.id || "untitled");
  const slug = label
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\-\s]/gu, "")
    .trim()
    .replace(/\s+/g, "_");
  const relativePath = `${getGraphFolderForNodeType(node.type || "concept")}/${slug || "untitled"}.md`;
  const normalizedBase = normalizeGraphPathBase(basePath);

  return normalizedBase ? `${normalizedBase}/${relativePath}` : relativePath;
};

export default function NetworkGraphClient({
  triplets,
  robots,
  inventory,
  contributions,
  currentLang = "en"
}: NetworkGraphClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<any>(null);
  const t = getTranslation(currentLang);

  // States
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [minConfidence, setMinConfidence] = useState(0.0);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [showArrows, setShowArrows] = useState(true);
  const [showPrivateData, setShowPrivateData] = useState(false);
  const [graphMode, setGraphMode] = useState<"global" | "local" | "contribution" | "ownership" | "perspective" | "timeline">("global");

  // Filters check states
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<Record<string, boolean>>({
    robot: true,
    owned_inventory: true,
    person: true,
    organization: true,
    company: true,
    university_lab: true,
    media_source: true,
    paper: true,
    event: true,
    concept: true,
    theme: true,
    contribution: true,
    place: true
  });

  const [selectedRelations, setSelectedRelations] = useState<Record<string, boolean>>({
    developed: true,
    deployed: true,
    used_for: true,
    discusses: true,
    affiliated_with: true,
    contributed_to: true,
    expresses_concern_about: true,
    instance_of: true,
    located_at: true,
    uses: true
  });

  // Timeline year filter
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [useYearFilter, setUseYearFilter] = useState(false);

  // Copy local graph paths settings
  const [copyBasePath, setCopyBasePath] = useState("");
  const [copyOutputFormat, setCopyOutputFormat] = useState<"newline" | "semicolon">("newline");
  const [copyExcluded, setCopyExcluded] = useState("");
  const [copiedStatus, setCopiedStatus] = useState("");

  // Load cytoscape on mount
  useEffect(() => {
    import("cytoscape").then((cy) => {
      cytoscape = cy.default || cy;
      setIsLoaded(true);
    });
  }, []);

  // Construct Cytoscape elements (nodes & edges) from DB data
  const graphData = useMemo(() => {
    const nodesMap = new Map<string, any>();
    const edges: any[] = [];

    // Helper to add or merge node
    const addNode = (id: string, label: string, type: string, extraData: any = {}) => {
      if (!id) return;
      const key = id.trim();
      const existing = nodesMap.get(key);
      
      let importance = 1;
      if (existing) {
        importance = existing.importance + 1;
      }

      nodesMap.set(key, {
        id: key,
        label: label || id,
        type: type || "concept",
        importance,
        ...extraData
      });
    };

    // 1. Add Robot Models
    robots.forEach((r) => {
      addNode(r.canonicalName, r.canonicalName, "robot", {
        manufacturer: r.manufacturer,
        countryOfOrigin: r.countryOfOrigin,
        robotType: r.robotType,
        thailandStatus: r.thailandStatus,
        statusConfidence: r.statusConfidence,
        description: r.description
      });
    });

    // 2. Add Owned Inventory Units
    inventory.forEach((item) => {
      const isPrivate = item.visibility === "private";
      addNode(item.displayName, item.displayName, "owned_inventory", {
        isPrivate,
        ownershipStatus: item.ownershipStatus,
        ownerOrg: item.ownerOrg,
        custodian: item.custodian,
        locationLabel: item.locationLabel,
        serialNumber: item.serialNumber,
        conditionStatus: item.conditionStatus,
        visibility: item.visibility,
        notes: item.notes
      });

      // Edge to Robot Model
      if (item.robotModel?.canonicalName) {
        edges.push({
          id: `inv-model-${item.id}`,
          source: item.displayName,
          target: item.robotModel.canonicalName,
          relation: "instance_of",
          confidence: 1.0,
          isPrivate
        });
      }
    });

    // 3. Add Contributions
    contributions.forEach((c) => {
      addNode(c.title, c.title, "contribution", {
        contributionType: c.contributionType,
        organization: c.organization,
        contributorName: c.contributorName,
        sourceUrl: c.sourceUrl,
        verificationStatus: c.verificationStatus
      });

      // Edge from contributor to contribution
      if (c.contributorName) {
        const contributorType = c.contributorType === "individual" ? "person" : "organization";
        addNode(c.contributorName, c.contributorName, contributorType);
        
        edges.push({
          id: `contrib-auth-${c.id}`,
          source: c.contributorName,
          target: c.title,
          relation: "contributed_to",
          confidence: 0.9
        });
      }

      // Edge from contribution to robot
      if (c.relatedRobotModelId) {
        const matchingRobot = robots.find((r) => r.id === c.relatedRobotModelId);
        if (matchingRobot) {
          edges.push({
            id: `contrib-robot-${c.id}`,
            source: c.title,
            target: matchingRobot.canonicalName,
            relation: "uses",
            confidence: 0.95
          });
        }
      }
    });

    // 4. Add Triplets
    triplets.forEach((t, i) => {
      // Deduce node types from names or relations
      let subType = "concept";
      let objType = "concept";

      // If subject matches a robot name
      if (robots.some((r) => r.canonicalName.toLowerCase() === t.subject.toLowerCase())) {
        subType = "robot";
      }
      if (robots.some((r) => r.canonicalName.toLowerCase() === t.object.toLowerCase())) {
        objType = "robot";
      }

      // Check relation indicators
      if (t.relation === "affiliated_with" || t.relation === "developed_by") {
        objType = "organization";
      }

      addNode(t.subject, t.subject, subType);
      addNode(t.object, t.object, objType);

      edges.push({
        id: `triplet-${t.id || i}`,
        source: t.subject,
        target: t.object,
        relation: t.relation,
        confidence: t.confidence || 0.5,
        sourceRecord: t.source,
        sourceId: t.sourceId
      });
    });

    // Node classification maps
    const nodes = Array.from(nodesMap.values());

    return { nodes, edges };
  }, [triplets, robots, inventory, contributions]);

  // Filter elements based on current settings
  const filteredElements = useMemo(() => {
    const { nodes, edges } = graphData;

    // Filter edges first
    const activeEdges = edges.filter((e) => {
      // 1. Confidence filter
      if (e.confidence < minConfidence) return false;

      // 2. Relation type filter
      if (!selectedRelations[e.relation]) return false;

      // 3. Private data filter
      if (e.isPrivate && !showPrivateData) return false;

      // 4. Timeline filter (if active)
      if (useYearFilter && e.sourceRecord?.publishedAt) {
        const pubYear = new Date(e.sourceRecord.publishedAt).getFullYear();
        if (pubYear > selectedYear) return false;
      }

      return true;
    });

    // Collect active node IDs from edges, or add all nodes if they match filters
    const activeNodeIds = new Set<string>();
    activeEdges.forEach((e) => {
      activeNodeIds.add(e.source);
      activeNodeIds.add(e.target);
    });

    // Filter nodes
    const activeNodes = nodes.filter((n) => {
      // 1. Node type filter
      if (!selectedNodeTypes[n.type]) return false;

      // 2. Private data filter
      if (n.isPrivate && !showPrivateData) return false;

      // 3. For local graph mode, we might restrict nodes (will do this inside Cytoscape layout or state)
      return true;
    });

    // Merge nodes that are part of active edges or just match filters
    const nodesToKeep = activeNodes.filter((n) => {
      if (graphMode === "global") return true;
      if (graphMode === "contribution") {
        return ["robot", "person", "organization", "contribution"].includes(n.type);
      }
      if (graphMode === "ownership") {
        return ["robot", "owned_inventory"].includes(n.type);
      }
      if (graphMode === "perspective") {
        return ["robot", "media_source", "theme", "concept"].includes(n.type);
      }
      return true;
    });

    const keepNodeIds = new Set(nodesToKeep.map((n) => n.id));

    // Filter edges again to ensure both endpoints exist
    const finalEdges = activeEdges.filter((e) => {
      return keepNodeIds.has(e.source) && keepNodeIds.has(e.target);
    });

    // Compile into cytoscape format
    const cyNodes = nodesToKeep.map((n) => {
      // Node colors and sizes based on styling requirements
      let color = "#888888";
      let shape = "ellipse";

      switch (n.type) {
        case "robot":
          color = "#276b73"; // primary accent
          shape = "hexagon";
          break;
        case "owned_inventory":
          color = n.isPrivate ? "#a33b35" : "#2f7d4f"; // private-data vs public-safe
          shape = "rectangle";
          break;
        case "person":
          color = "#a86412"; // warning/orange
          shape = "ellipse";
          break;
        case "organization":
        case "company":
        case "university_lab":
          color = "#553c9a";
          shape = "triangle";
          break;
        case "contribution":
          color = "#2b6cb0";
          shape = "diamond";
          break;
        case "theme":
          color = "#b7791f";
          shape = "round-rectangle";
          break;
        case "media_source":
          color = "#d53f8c";
          shape = "ellipse";
          break;
        default:
          color = "#4a5568";
          shape = "ellipse";
      }

      // Calculate size based on importance/centrality
      const size = Math.min(60, Math.max(25, 20 + n.importance * 3));

      return {
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          color,
          shape,
          size,
          borderWidth: n.isPrivate ? 3 : 1,
          borderStyle: n.isPrivate ? "dashed" : "solid",
          borderColor: "#ffffff",
          raw: n
        }
      };
    });

    const cyEdges = finalEdges.map((e) => {
      // Calculate opacity and width from confidence
      const opacity = Math.min(1.0, Math.max(0.2, e.confidence));
      const width = Math.min(8, Math.max(1.5, e.confidence * 4));

      return {
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: showEdgeLabels ? e.relation : "",
          opacity,
          width,
          raw: e
        }
      };
    });

    return [...cyNodes, ...cyEdges];
  }, [graphData, minConfidence, selectedNodeTypes, selectedRelations, showEdgeLabels, showPrivateData, graphMode, useYearFilter, selectedYear]);

  // Run Cytoscape initialization and layout
  useEffect(() => {
    if (!isLoaded || !containerRef.current || filteredElements.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Stylesheet config matching theme
    const style = [
      {
        selector: "node",
        style: {
          "background-color": "data(color)",
          "label": "data(label)",
          "width": "data(size)",
          "height": "data(size)",
          "shape": "data(shape)",
          "color": "#17211c",
          "font-size": "10px",
          "font-weight": "bold",
          "text-valign": "center",
          "text-halign": "center",
          "text-outline-color": "#ffffff",
          "text-outline-width": 2,
          "border-width": "data(borderWidth)",
          "border-style": "data(borderStyle)",
          "border-color": "data(borderColor)",
          "overlay-opacity": 0,
          "transition-property": "background-color, border-color",
          "transition-duration": 0.25
        }
      },
      {
        selector: "node:selected",
        style: {
          "border-color": "#000000",
          "border-width": 3,
          "text-outline-color": "#ffe082"
        }
      },
      {
        selector: "edge",
        style: {
          "width": "data(width)",
          "line-color": "#888888",
          "target-arrow-color": "#888888",
          "target-arrow-shape": showArrows ? "triangle" : "none",
          "curve-style": "bezier",
          "opacity": "data(opacity)",
          "label": "data(label)",
          "font-size": "8px",
          "color": "#5c6861",
          "text-rotation": "autorotate",
          "text-background-opacity": 0.7,
          "text-background-color": "#ffffff",
          "text-background-padding": "2px"
        }
      },
      {
        selector: "edge:selected",
        style: {
          "line-color": "var(--accent)",
          "target-arrow-color": "var(--accent)",
          "width": 5
        }
      }
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements: filteredElements,
      style: style as any,
      layout: {
        name: "cose",
        idealEdgeLength: (edge: any) => 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 40,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: (node: any) => 400000,
        edgeElasticity: (edge: any) => 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      } as any
    });

    cyRef.current = cy;

    // Click node handler
    cy.on("tap", "node", (evt: any) => {
      const node = evt.target;
      setSelectedElement({
        type: "node",
        data: node.data("raw"),
        id: node.id(),
        label: node.data("label"),
        nodeType: node.data("type"),
        color: node.data("color")
      });
    });

    // Click edge handler
    cy.on("tap", "edge", (evt: any) => {
      const edge = evt.target;
      setSelectedElement({
        type: "edge",
        data: edge.data("raw"),
        id: edge.id(),
        source: edge.source().id(),
        target: edge.target().id(),
        relation: edge.data("raw").relation,
        confidence: edge.data("raw").confidence
      });
    });

    // Click canvas handler (clear selection)
    cy.on("tap", (evt: any) => {
      if (evt.target === cy) {
        setSelectedElement(null);
      }
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [filteredElements, isLoaded, showArrows]);

  // Handler search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cyRef.current || !searchQuery) return;

    const matched = cyRef.current.nodes().filter((n: any) => 
      n.id().toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.data("label").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matched.length > 0) {
      cyRef.current.elements().unselect();
      matched.select();
      
      // Center view on matches
      cyRef.current.animate({
        center: { eles: matched },
        zoom: Math.min(cyRef.current.zoom(), 1.5),
        duration: 500
      });

      // Show detail panel of first match
      const node = matched[0];
      setSelectedElement({
        type: "node",
        data: node.data("raw"),
        id: node.id(),
        label: node.data("label"),
        nodeType: node.data("type"),
        color: node.data("color")
      });
    }
  };

  // Zoom/Pan controls
  const zoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2);
  const zoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() / 1.2);
  const fitView = () => cyRef.current?.fit(undefined, 30);
  const resetGraph = () => {
    cyRef.current?.reset();
    cyRef.current?.layout({ name: "cose" }).run();
    setSelectedElement(null);
  };

  // Toggle single type helper
  const toggleNodeType = (type: string) => {
    setSelectedNodeTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Compute local graph paths for the selected node
  const localGraphPaths = useMemo(() => {
    if (!selectedElement || selectedElement.type !== "node") return [];

    const excludedFolders = copyExcluded
      .split(",")
      .map((folder) => folder.trim().toLowerCase())
      .filter(Boolean);
    const nodeById = new Map(graphData.nodes.map((node) => [node.id, node]));
    const linkedPaths = new Set<string>();

    graphData.edges.forEach((edge) => {
      const neighborId =
        edge.source === selectedElement.id
          ? edge.target
          : edge.target === selectedElement.id
            ? edge.source
            : null;

      if (!neighborId) return;

      const neighborNode = nodeById.get(neighborId);
      if (!neighborNode) return;

      const fullPath = createGraphFilePath(neighborNode, copyBasePath);
      const searchablePath = fullPath.toLowerCase();
      const searchableType = String(neighborNode.type || "").toLowerCase();

      if (
        excludedFolders.some(
          (folder) => searchablePath.includes(folder) || searchableType.includes(folder)
        )
      ) {
        return;
      }

      linkedPaths.add(fullPath);
    });

    return Array.from(linkedPaths).sort((a, b) => a.localeCompare(b));
  }, [selectedElement, copyBasePath, copyExcluded, graphData]);

  const handleCopyPaths = async () => {
    if (localGraphPaths.length === 0) return;

    const separator = copyOutputFormat === "semicolon" ? ";" : "\n";
    const pathsString = localGraphPaths.join(separator);

    try {
      await navigator.clipboard.writeText(pathsString);
      setCopiedStatus(currentLang === "th" ? "คัดลอกแล้ว!" : "Copied!");
      setTimeout(() => setCopiedStatus(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      setCopiedStatus(currentLang === "th" ? "ล้มเหลว!" : "Failed!");
      setTimeout(() => setCopiedStatus(""), 2000);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .cy-canvas-wrapper {
          position: relative;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #f8faf9;
          min-height: 520px;
        }
        .cy-render-container {
          width: 100%;
          height: 520px;
        }
        @media (max-width: 860px) {
          .cy-canvas-wrapper {
            min-height: 380px;
          }
          .cy-render-container {
            height: 380px;
          }
        }
      `}} />

      <div className="topline">
        <div>
          <h1>{t.networkTitle}</h1>
          <p className="muted">
            {t.networkDesc}
          </p>
        </div>
      </div>

      {/* Graph Mode Tabs */}
      <div className="toolbar" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px", margin: "0 0 14px 0" }}>
        {(["global", "local", "contribution", "ownership", "perspective", "timeline"] as const).map((mode) => (
          <button 
            key={mode} 
            onClick={() => {
              setGraphMode(mode);
              setUseYearFilter(mode === "timeline");
            }}
            className={`button ${graphMode === mode ? "primary" : ""}`}
            style={{ textTransform: "capitalize" }}
          >
            {mode} Graph
          </button>
        ))}
      </div>

      <div className="two" style={{ gap: "16px" }}>
        {/* Left Side: Canvas and Toolbar Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          
          {/* Filters and Search Bar */}
          <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: "6px", width: "100%", maxWidth: "340px" }}>
              <input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nodes by name..." 
                style={{ flex: 1 }}
              />
              <button type="submit" className="primary"><Search size={15} /> Search</button>
            </form>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {/* Confidence Slider */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="muted" style={{ fontSize: "12px" }}>Min Confidence:</span>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={minConfidence} 
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  style={{ width: "80px", minHeight: "auto", height: "4px" }}
                />
                <span style={{ fontSize: "12px", fontWeight: "bold" }}>{minConfidence.toFixed(2)}</span>
              </div>

              {/* Private visibility toggle */}
              <button 
                onClick={() => setShowPrivateData(!showPrivateData)} 
                className="button"
                style={{ border: showPrivateData ? "1px solid var(--danger)" : "1px solid var(--border)", fontSize: "12px" }}
              >
                {showPrivateData ? <Eye size={14} color="var(--danger)" /> : <EyeOff size={14} />}
                {showPrivateData ? "Hide Private Layer" : "Show Private Layer"}
              </button>

              {/* Edge label toggle */}
              <button 
                onClick={() => setShowEdgeLabels(!showEdgeLabels)} 
                className={`button ${showEdgeLabels ? "primary" : ""}`}
                style={{ fontSize: "12px" }}
              >
                {showEdgeLabels ? "Hide Edge Labels" : "Show Edge Labels"}
              </button>
            </div>
          </div>

          {/* Cytoscape Container Canvas */}
          <div className="cy-canvas-wrapper">
            
            {/* Quick Canvas Action Controls */}
            <div style={{ position: "absolute", bottom: "12px", left: "12px", zIndex: 10, display: "flex", gap: "6px" }}>
              <button className="button" onClick={zoomIn} title="Zoom In"><ZoomIn size={16} /></button>
              <button className="button" onClick={zoomOut} title="Zoom Out"><ZoomOut size={16} /></button>
              <button className="button" onClick={fitView} title="Fit to Screen"><Maximize2 size={16} /></button>
              <button className="button" onClick={resetGraph} title="Reset Force Layout"><RefreshCw size={16} /></button>
            </div>

            {/* Cytoscape element render */}
            {filteredElements.length > 0 ? (
              <div ref={containerRef} className="cy-render-container" />
            ) : (
              <div className="empty" style={{ paddingTop: "150px" }}>
                <h3>No relationships have been extracted yet.</h3>
                <p className="muted" style={{ fontSize: "13px" }}>
                  Your current filters might be too restrictive, or the graph cache is empty.
                </p>
                <div style={{ maxWidth: "480px", margin: "14px auto", textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", padding: "14px", borderRadius: "8px" }}>
                  <strong>Operator Actions to Populate Graph:</strong>
                  <pre style={{ fontSize: "11px", marginTop: "8px", background: "var(--surface-muted)", padding: "8px", borderRadius: "4px" }}>
                    <code>
{`# 1. Run NLP pipeline relationship extraction
python -m openatlas analyze nlp

# 2. Rebuild graph database index
python -m openatlas analyze graph

# 3. Add seed relationships manually in:
data/seeds/relationships.yaml`}
                    </code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Graph filters checklists and Detail Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          
          {/* Node Types checklists */}
          <div className="panel">
            <h2>Node Filters</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "6px", fontSize: "12px" }}>
              {Object.keys(selectedNodeTypes).map((type) => (
                <label key={type} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={selectedNodeTypes[type]} 
                    onChange={() => toggleNodeType(type)}
                    style={{ minHeight: "auto" }}
                  />
                  <span style={{ textTransform: "capitalize", fontSize: "11px" }}>{type.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Timeline slider (Visible in Timeline Graph mode) */}
          {useYearFilter && (
            <div className="panel">
              <h2>Ingestion Timeline Slider</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="muted" style={{ fontSize: "12px" }}>Limit up to Year:</span>
                  <strong>{selectedYear}</strong>
                </div>
                <input 
                  type="range"
                  min="2015"
                  max="2026"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{ width: "100%", minHeight: "auto" }}
                />
                <span className="muted" style={{ fontSize: "11px" }}>Showing relationship signals ingested/published up to {selectedYear}.</span>
              </div>
            </div>
          )}

          {/* Detail Side Panel */}
          {selectedElement ? (
            <div className="panel" style={{ border: "1px solid var(--accent)", flex: 1, maxHeight: "400px", overflowY: "auto", position: "relative" }}>
              <button 
                onClick={() => setSelectedElement(null)} 
                style={{ position: "absolute", top: "10px", right: "10px", border: "none", background: "none", cursor: "pointer" }}
              >
                <X size={16} />
              </button>

              {selectedElement.type === "node" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: selectedElement.color }} />
                    <span className="badge" style={{ textTransform: "uppercase", fontSize: "10px" }}>{selectedElement.nodeType.replace(/_/g, " ")}</span>
                  </div>
                  <h2 style={{ fontSize: "18px", wordBreak: "break-all", paddingRight: "20px" }}>{selectedElement.label}</h2>

                  {/* Robot Metadata detail */}
                  {selectedElement.nodeType === "robot" && (
                    <div style={{ marginTop: "10px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div><strong>Manufacturer:</strong> {selectedElement.data.manufacturer || "Unknown"}</div>
                      <div><strong>Country:</strong> {selectedElement.data.countryOfOrigin || "Unknown"}</div>
                      <div><strong>Type:</strong> {selectedElement.data.robotType}</div>
                      <div><strong>Thailand Status:</strong> {selectedElement.data.thailandStatus}</div>
                      <div><strong>Confidence:</strong> {selectedElement.data.statusConfidence}</div>
                      {selectedElement.data.description && (
                        <p style={{ marginTop: "6px", fontStyle: "italic", color: "var(--text-secondary)" }}>
                          {selectedElement.data.description}
                        </p>
                      )}
                      <Link href="/robots" className="button primary" style={{ display: "block", textAlign: "center", marginTop: "10px", fontSize: "12px", minHeight: "auto", padding: "6px" }}>
                        Open Registry Record
                      </Link>
                    </div>
                  )}

                  {/* Owned Inventory Metadata detail */}
                  {selectedElement.nodeType === "owned_inventory" && (
                    <div style={{ marginTop: "10px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div><strong>Status:</strong> <span className="badge">{selectedElement.data.ownershipStatus}</span></div>
                      <div><strong>Owner Org:</strong> {selectedElement.data.ownerOrg || "N/A"}</div>
                      <div><strong>Custodian:</strong> {selectedElement.data.custodian || "N/A"}</div>
                      <div><strong>Location:</strong> {selectedElement.data.locationLabel || "🔒 [Masked]"}</div>
                      <div><strong>Serial:</strong> <code>{selectedElement.data.serialNumber || "🔒 [Masked]"}</code></div>
                      <div><strong>Condition:</strong> {selectedElement.data.conditionStatus}</div>
                      {selectedElement.data.notes && (
                        <p style={{ marginTop: "6px", fontStyle: "italic", color: "var(--text-secondary)" }}>
                          {selectedElement.data.notes}
                        </p>
                      )}
                      <Link href="/inventory" className="button primary" style={{ display: "block", textAlign: "center", marginTop: "10px", fontSize: "12px", minHeight: "auto", padding: "6px" }}>
                        Open Inventory Sheet
                      </Link>
                    </div>
                  )}

                  {/* Contribution Metadata detail */}
                  {selectedElement.nodeType === "contribution" && (
                    <div style={{ marginTop: "10px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div><strong>Type:</strong> {selectedElement.data.contributionType?.replace(/_/g, " ")}</div>
                      <div><strong>Organization:</strong> {selectedElement.data.organization || "N/A"}</div>
                      <div><strong>Contributor:</strong> {selectedElement.data.contributorName || "N/A"}</div>
                      <div><strong>Review Status:</strong> {selectedElement.data.verificationStatus}</div>
                      {selectedElement.data.sourceUrl && (
                        <a href={selectedElement.data.sourceUrl} target="_blank" rel="noreferrer" className="button" style={{ display: "block", textAlign: "center", marginTop: "10px", fontSize: "12px", minHeight: "auto", padding: "6px" }}>
                          Open Source Link
                        </a>
                      )}
                    </div>
                  )}

                  {/* Generic entity description */}
                  {["robot", "owned_inventory", "contribution"].indexOf(selectedElement.nodeType) === -1 && (
                    <div style={{ marginTop: "10px", fontSize: "13px" }}>
                      <p className="muted">This entity is loaded as a relational node from public media or academic extraction logs.</p>
                    </div>
                  )}

                  {/* Copy Local Graph Paths Implementation */}
                  <div className="copy-paths-section" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <div className="copy-paths-title" style={{ fontSize: "13.5px", fontWeight: 800, textTransform: "uppercase", color: "var(--accent)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FolderOpen size={15} /> {t.copyLocalGraphPaths}
                    </div>
                    
                    <div className="copy-paths-row" style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)" }}>{t.basePathLabel}</label>
                      <input 
                        type="text"
                        placeholder="e.g. https://github.com/creativelab/"
                        value={copyBasePath}
                        onChange={(e) => setCopyBasePath(e.target.value)}
                        style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px", background: "#040a08", color: "#10B981" }}
                      />
                      <span className="muted" style={{ fontSize: "10px", color: "var(--text-secondary)", opacity: 0.8 }}>{t.basePathDesc}</span>
                    </div>

                    <div className="copy-paths-row" style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)" }}>{t.outputFormatLabel}</label>
                      <select 
                        value={copyOutputFormat}
                        onChange={(e) => setCopyOutputFormat(e.target.value as "newline" | "semicolon")}
                        style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px", background: "#040a08", color: "#10B981" }}
                      >
                        <option value="newline">{t.newlineSeparated}</option>
                        <option value="semicolon">{t.semicolonSeparated}</option>
                      </select>
                      <span className="muted" style={{ fontSize: "10px", color: "var(--text-secondary)", opacity: 0.8 }}>{t.outputFormatDesc}</span>
                    </div>

                    <div className="copy-paths-row" style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                      <label style={{ fontSize: "11px", fontWeight: "bold", color: "var(--text-secondary)" }}>{t.excludedFoldersLabel}</label>
                      <input 
                        type="text"
                        placeholder="e.g. concept, theme"
                        value={copyExcluded}
                        onChange={(e) => setCopyExcluded(e.target.value)}
                        style={{ padding: "6px 8px", fontSize: "12px", border: "1px solid var(--border)", borderRadius: "4px", background: "#040a08", color: "#10B981" }}
                      />
                      <span className="muted" style={{ fontSize: "10px", color: "var(--text-secondary)", opacity: 0.8 }}>{t.excludedFoldersDesc}</span>
                    </div>

                    {localGraphPaths.length > 0 ? (
                      <>
                        <div style={{ fontSize: "11.5px", fontWeight: "bold", marginBottom: "4px", color: "var(--text)" }}>{t.pathPreviewLabel} ({localGraphPaths.length}):</div>
                        <div className="copy-paths-preview" style={{ background: "#040a08", color: "#10B981", fontFamily: "monospace", fontSize: "11px", padding: "8px", borderRadius: "4px", maxHeight: "100px", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", border: "1px solid var(--border)", marginBottom: "8px" }}>
                          {localGraphPaths.join(copyOutputFormat === "semicolon" ? "; " : "\n")}
                        </div>

                        <button 
                          onClick={handleCopyPaths}
                          className="button primary" 
                          style={{ width: "100%", padding: "8px", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}
                        >
                          <Copy size={14} /> {copiedStatus || t.copyButtonLabel}
                        </button>
                      </>
                    ) : (
                      <div className="muted" style={{ fontSize: "11px", fontStyle: "italic", textAlign: "center", padding: "8px", background: "var(--surface-muted)", borderRadius: "4px" }}>
                        {t.noPathsWarning}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <span className="badge" style={{ textTransform: "uppercase", fontSize: "10px", marginBottom: "6px" }}>RELATIONSHIP EDGE</span>
                  <h2 style={{ fontSize: "16px", marginTop: "4px" }}>{selectedElement.relation}</h2>
                  
                  <div style={{ marginTop: "10px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div><strong>Subject:</strong> <code>{selectedElement.source}</code></div>
                    <div><strong>Relation:</strong> <code>{selectedElement.relation}</code></div>
                    <div><strong>Object:</strong> <code>{selectedElement.target}</code></div>
                    <div>
                      <strong>Confidence Score:</strong>{" "}
                      <span className={`badge ${selectedElement.confidence < 0.6 ? "warn" : "ok"}`}>
                        {selectedElement.confidence.toFixed(2)}
                      </span>
                    </div>

                    {selectedElement.data.sourceRecord && (
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "6px" }}>
                        <strong>Evidence Excerpt:</strong>
                        <blockquote style={{ margin: "6px 0 0 0", padding: "0 0 0 8px", borderLeft: "3px solid var(--accent)", fontStyle: "italic", fontSize: "12px" }}>
                          "{selectedElement.data.sourceRecord.excerpt || "No excerpt recorded in source record."}"
                        </blockquote>
                        <div style={{ marginTop: "8px" }}>
                          <strong>Source URL:</strong><br />
                          <a 
                            href={selectedElement.data.sourceRecord.url} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{ wordBreak: "break-all", fontSize: "12px", color: "var(--accent)" }}
                          >
                            {selectedElement.data.sourceRecord.url}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="panel muted" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "150px", textAlign: "center", background: "#fafbfc" }}>
              <HelpCircle size={32} style={{ marginBottom: "8px", opacity: 0.6 }} />
              <p style={{ fontSize: "12px" }}>Click on any node or edge connection in the graph to view properties, logs, and evidence.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
