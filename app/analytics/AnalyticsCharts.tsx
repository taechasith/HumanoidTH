"use client";

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ThemeRow = { perspectiveTheme: string; _count: { _all: number } };
type StatusRow = { relevanceStatus: string; _count: { _all: number } };

interface AnalyticsChartsProps {
  themes: ThemeRow[];
  statuses: StatusRow[];
}

const themeColors = ["#19523c", "#28744b", "#4f8b62", "#7fa87f", "#a9bea9", "#d4af37", "#c5931b", "#9c2e26"];
const statusColors: Record<string, string> = {
  ACCEPTED: "#28744b",
  UNCERTAIN: "#d4af37",
  REJECTED: "#9c2e26",
  PENDING: "#4f8b62"
};

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function capitalize(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function sortDesc<T extends { _count: { _all: number } }>(rows: T[]) {
  return [...rows].sort((a, b) => b._count._all - a._count._all);
}

export default function AnalyticsCharts({ themes, statuses }: AnalyticsChartsProps) {
  const orderedThemes = sortDesc(themes).slice(0, 8);
  const orderedStatuses = sortDesc(statuses);
  const totalThemes = orderedThemes.reduce((sum, row) => sum + row._count._all, 0);
  const totalStatuses = orderedStatuses.reduce((sum, row) => sum + row._count._all, 0);

  const themeData = orderedThemes.map((row) => ({
    name: humanize(row.perspectiveTheme),
    value: row._count._all
  }));

  const statusData = orderedStatuses.map((row) => ({
    name: row.relevanceStatus,
    label: capitalize(row.relevanceStatus),
    value: row._count._all,
    fill: statusColors[row.relevanceStatus] ?? "#19523c"
  }));

  return (
    <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 0.9fr)" }}>
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
          <div>
            <h2>Perspective Theme Distribution</h2>
            <div className="muted" style={{ fontSize: "12px" }}>
              Top {orderedThemes.length} themes by count. Horizontal bars keep long labels readable.
            </div>
          </div>
          <div className="badge">Total {totalThemes}</div>
        </div>

        <div style={{ width: "100%", height: 340, marginTop: "12px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={themeData} layout="vertical" margin={{ top: 6, right: 20, bottom: 6, left: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d8ded8" />
              <XAxis type="number" allowDecimals={false} stroke="#56645c" />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                tick={{ fontSize: 12 }}
                stroke="#56645c"
              />
              <Tooltip
                cursor={{ fill: "rgba(25, 82, 60, 0.08)" }}
                formatter={(value: unknown) => [value as number, "Records"]}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {themeData.map((entry, index) => (
                  <Cell key={entry.name} fill={themeColors[index % themeColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
          <div>
            <h2>Relevance Status Mix</h2>
            <div className="muted" style={{ fontSize: "12px" }}>
              Share of source records by relevance state.
            </div>
          </div>
          <div className="badge">Total {totalStatuses}</div>
        </div>

        <div style={{ width: "100%", height: 280, marginTop: "12px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="label"
                innerRadius={68}
                outerRadius={102}
                paddingAngle={3}
              >
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown, name: unknown) => [value as number, name as string]} />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value: string) => humanize(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: "grid", gap: "8px", marginTop: "6px" }}>
          {orderedStatuses.map((row) => {
            const count = row._count._all;
            const pct = totalStatuses > 0 ? (count / totalStatuses) * 100 : 0;
            const color = statusColors[row.relevanceStatus] ?? "#19523c";
            return (
              <div key={row.relevanceStatus}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px", marginBottom: "4px" }}>
                  <span>{humanize(row.relevanceStatus)}</span>
                  <strong>{count} ({pct.toFixed(1)}%)</strong>
                </div>
                <div style={{ height: "8px", borderRadius: "999px", background: "var(--surface-muted)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
