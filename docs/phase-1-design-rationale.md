# Phase 1 design rationale

The redesigned landing page treats the robot as a friendly research guide rather than decoration. A compact hero establishes the purpose of HumanoidTH, then moves the most useful evidence - live corpus totals, data origins, and clear next steps - into a deliberate reading order. Ingestion origins are distinct from source record types, and the long tail is grouped instead of presenting raw domains as primary categories.

The dashboard replaces six dense lists with a 5-KPI row and a small set of grouped views. Use-context categories make robot composition comparable, while source record type is explicitly labelled as a different dimension. Confidence is presented as two stacked distributions with shared thresholds. Both pages expose a Live data indicator and avoid silently substituting mock values when the database is unavailable.

The application shell keeps the requested left navigation, adds a lightweight workspace header, and uses warm off-white surfaces, deep green actions, restrained borders, and consistent 14px cards. The navigation remains usable on tablet through the existing responsive mobile header and tab bar.

## Components introduced in Phase 1

- `WorkspaceHeader` - context, data status, search affordance, and profile entry.
- Overview hero - research positioning, interactive mascot stage, data-origin panel, and KPI cards.
- Quick actions - single-purpose entry points with visible role restrictions.
- Dashboard KPI cards - five non-duplicated ecosystem totals.
- Dashboard chart cards - grouped horizontal bars, accessible CSS donuts, and stacked confidence bars.
- Shared visual primitives in `globals.css` - page header, status indicator, cards, badges, responsive grids, and chart legend styles.
