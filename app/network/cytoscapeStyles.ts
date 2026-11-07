import type { SingularElementArgument, StylesheetJson } from "cytoscape";

const clusterColors: Record<string, string> = {
  healthcare_and_elderly_care: "#60d394",
  hospital_service_robots: "#38bdf8",
  education_robotics: "#facc15",
  humanoid_robots: "#a78bfa",
  public_safety_robots: "#fb7185",
  research_and_academic_contributions: "#f59e0b",
  media_perspectives: "#22d3ee",
  owned_inventory: "#f97316",
  companies_and_institutions: "#94a3b8",
  international_robots_shown_in_thailand: "#34d399",
  unknown: "#64748b"
};

// Relationship type is encoded by hue. Keeping every edge at the same base
// width makes dense areas readable without treating a merged source count as
// visual priority.
const relationColors: Record<string, string> = {
  developed_by: "#f5b942",
  created_by: "#f5b942",
  initiated_by: "#fb923c",
  operated_by: "#2dd4bf",
  owned_by: "#fb923c",
  collaborated_with: "#c084fc",
  connects_to: "#22d3ee",
  relates_to: "#38bdf8",
  deployed_in: "#60a5fa",
  located_in: "#60a5fa",
  showcased_at: "#fb7185",
  published_by: "#a78bfa",
  authored_by: "#a78bfa",
  instance_of: "#5eead4",
  has_theme: "#facc15",
  discusses: "#94a3b8",
  mentions: "#94a3b8"
};

export const edgeColorLegend = [
  { key: "development", color: relationColors.developed_by },
  { key: "ownership", color: relationColors.owned_by },
  { key: "operations", color: relationColors.operated_by },
  { key: "collaboration", color: relationColors.collaborated_with },
  { key: "connection", color: relationColors.connects_to },
  { key: "association", color: relationColors.relates_to },
  { key: "placement", color: relationColors.deployed_in },
  { key: "showcase", color: relationColors.showcased_at },
  { key: "publication", color: relationColors.published_by },
  { key: "classification", color: relationColors.instance_of },
  { key: "theme", color: relationColors.has_theme },
  { key: "reference", color: relationColors.mentions }
] as const;

function relationColor(relation: unknown) {
  return relationColors[String(relation)] ?? "#7dd3c7";
}

export function networkStyles(showArrows: boolean, showLabels: boolean, animationsEnabled = true): StylesheetJson {
  return [
    {
      selector: "node",
      style: {
        "background-color": (ele: SingularElementArgument) => clusterColors[String(ele.data("cluster"))] ?? clusterColors.unknown,
        "border-color": "#d9fff0",
        "border-opacity": 0.5,
        "border-width": 1,
        "color": "#e5fff5",
        "font-family": "Inter, system-ui, sans-serif",
        "font-size": 10,
        "height": (ele: SingularElementArgument) => Math.max(8, Math.min(34, 8 + Number(ele.data("degree") ?? 0) * 1.7 + Number(ele.data("source_count") ?? 0) * 0.8)),
        "label": "",
        "min-zoomed-font-size": 8,
        "opacity": 0.86,
        "overlay-opacity": 0,
        "overlay-padding": 4,
        "text-background-color": "#08130f",
        "text-background-opacity": 0,
        "text-background-padding": "2px",
        "text-margin-y": -10,
        "text-outline-color": "#08130f",
        "text-outline-opacity": 0,
        "text-outline-width": 1,
        "text-opacity": 0,
        "text-valign": "top",
        "transition-duration": animationsEnabled ? 220 : 0,
        "transition-property": "width height border-width border-color opacity overlay-opacity text-opacity text-background-opacity text-outline-opacity",
        "transition-timing-function": "ease-out",
        "width": (ele: SingularElementArgument) => Math.max(8, Math.min(34, 8 + Number(ele.data("degree") ?? 0) * 1.7 + Number(ele.data("source_count") ?? 0) * 0.8))
      }
    },
    {
      selector: "node.important",
      style: {
        "border-color": "#f5d26c",
        "border-opacity": 0.9,
        "border-width": 3,
        "height": (ele: SingularElementArgument) => Math.max(26, Math.min(66, 22 + Number(ele.data("degree") ?? 0) * 2.2 + Number(ele.data("source_count") ?? 0) * 1.4)),
        "opacity": 1,
        "width": (ele: SingularElementArgument) => Math.max(26, Math.min(66, 22 + Number(ele.data("degree") ?? 0) * 2.2 + Number(ele.data("source_count") ?? 0) * 1.4)),
        "z-index": 20
      }
    },
    {
      selector: "node.minor",
      style: {
        "border-opacity": 0.12,
        "border-width": 1,
        "height": 6,
        "opacity": 0.2,
        "width": 6,
        "z-index": 1
      }
    },
    {
      selector: "node.show-label",
      style: {
        "font-size": (ele: SingularElementArgument) => Number(ele.data("important")) ? 11 : 9,
        "label": "data(displayLabel)",
        "text-background-opacity": 0.82,
        "text-opacity": 1,
        "text-outline-opacity": 1
      }
    },
    {
      selector: "node.low-confidence",
      style: {
        "border-color": "#facc15",
        "border-style": "dashed",
        "border-width": 2,
        "opacity": 0.68
      }
    },
    {
      selector: "node.private",
      style: {
        "background-blacken": 0.35,
        "border-color": "#fb923c",
        "border-width": 3,
        "shape": "round-rectangle"
      }
    },
    {
      selector: "node:selected",
      style: {
        "border-color": "#ffffff",
        "border-width": 4,
        "height": (ele: SingularElementArgument) => Math.max(17, Math.min(58, 17 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0))),
        "overlay-color": "#d9fff0",
        "overlay-opacity": 0.12,
        "width": (ele: SingularElementArgument) => Math.max(17, Math.min(58, 17 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0)))
      }
    },
    {
      selector: "node.is-dragging",
      style: {
        "border-color": "#ffffff",
        "border-width": 5,
        "height": (ele: SingularElementArgument) => Math.max(20, Math.min(62, 20 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0))),
        "overlay-color": "#99f6d4",
        "overlay-opacity": 0.18,
        "z-index": 1200,
        "width": (ele: SingularElementArgument) => Math.max(20, Math.min(62, 20 + Number(ele.data("degree") ?? 0) * 2 + Number(ele.data("source_count") ?? 0)))
      }
    },
    {
      selector: "node.just-dropped, node.pulse",
      style: {
        "border-color": "#f5d26c",
        "border-width": 5,
        "overlay-color": "#f5d26c",
        "overlay-opacity": 0.16
      }
    },
    {
      selector: "edge",
      style: {
        "curve-style": "bezier",
        "color": "#d8fff0",
        "font-size": 9,
        "label": showLabels ? "data(label)" : "",
        "line-color": (ele: SingularElementArgument) => relationColor(ele.data("relation")),
        "line-opacity": (ele: SingularElementArgument) => Math.max(0.18, Math.min(0.8, Number(ele.data("confidence") ?? 0.5))),
        "opacity": (ele: SingularElementArgument) => Math.max(0.24, Math.min(0.9, Number(ele.data("confidence") ?? 0.5))),
        "target-arrow-color": (ele: SingularElementArgument) => relationColor(ele.data("relation")),
        "target-arrow-shape": showArrows ? "triangle" : "none",
        "text-background-color": "#08130f",
        "text-background-opacity": 0.85,
        "text-background-padding": "2px",
        "text-outline-color": "#08130f",
        "text-outline-width": 1,
        "text-opacity": showLabels ? 1 : 0,
        "transition-duration": animationsEnabled ? 200 : 0,
        "transition-property": "line-color target-arrow-color width opacity line-opacity text-opacity",
        "transition-timing-function": "ease-out",
        "width": 1.5
      }
    },
    {
      selector: "edge.low-confidence",
      style: {
        "line-style": "dashed",
        "line-color": "#facc15",
        "target-arrow-color": "#facc15"
      }
    },
    {
      selector: "edge.minor-link",
      style: {
        "line-opacity": 0.12,
        "opacity": 0.16,
        "width": 1.5
      }
    },
    {
      selector: ".faded",
      style: {
        "opacity": 0.08,
        "text-opacity": 0
      }
    },
    {
      selector: ".highlighted",
      style: {
        "opacity": 1,
        "z-index": 999
      }
    },
    {
      selector: "edge.highlighted",
      style: {
        "label": "data(label)",
        "line-color": "#ffffff",
        "target-arrow-color": "#ffffff",
        "text-opacity": 1,
        "width": 4
      }
    },
    {
      selector: "node.highlighted",
      style: {
        "border-color": "#ffffff",
        "border-width": 3
      }
    }
  ];
}
