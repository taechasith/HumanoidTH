"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import styles from "./AnalyticsPlayground.module.css";

type Scope = "all" | "sources" | "robots" | "contributions" | "perspectives" | "submissions";
type TimeBucket = "month" | "year";

type AnalyticsEvent = {
  scope: Scope;
  date: string | null;
  year: number | null;
  monthKey: string | null;
  label: string;
  confidence: number | null;
  eventType: string;
  sourceType: string;
  relevanceStatus: string;
  platform: string;
  robotType: string;
  thailandStatus: string;
  contributionType: string;
  verificationStatus: string;
  perspectiveTheme: string;
  stance: string;
  sentiment: string;
  submissionType: string;
  status: string;
  visibility: string;
  countryOfOrigin: string;
  ownerOrg: string;
};

interface AnalyticsPlaygroundProps {
  events: AnalyticsEvent[];
  lang: "en" | "th";
}

const confidenceCopy = {
  en: {
    title: "Confidence Lens",
    subtitle: "A histogram of confidence scores, so the distribution and review risk are clear at a glance.",
    scored: "Scored records",
    average: "Average score",
    review: "Needs review",
    coverage: "of this scope has a score",
    reviewHint: "below 0.50 confidence",
    high: "High confidence",
    medium: "Needs a quick check",
    low: "Needs review",
    highRange: "0.80–1.00 · safe to use with normal verification",
    mediumRange: "0.50–0.79 · usable, but confirm important claims",
    lowRange: "Below 0.50 · prioritise for review before relying on it",
    empty: "There are no confidence scores in the selected scope.",
    on: "On",
    off: "Off"
  },
  th: {
    title: "Confidence Lens",
    subtitle: "Histogram การกระจายคะแนนความเชื่อมั่น เพื่อเห็นคุณภาพข้อมูลและความเสี่ยงที่ต้องตรวจทานได้ทันที",
    scored: "รายการที่มีคะแนน",
    average: "คะแนนเฉลี่ย",
    review: "ควรตรวจทาน",
    coverage: "ของข้อมูลที่เลือกมีคะแนน",
    reviewHint: "คะแนนต่ำกว่า 0.50",
    high: "ความเชื่อมั่นสูง",
    medium: "ควรตรวจเร็ว ๆ",
    low: "ควรตรวจทาน",
    highRange: "0.80–1.00 · ใช้ต่อได้ตามขั้นตอนตรวจสอบปกติ",
    mediumRange: "0.50–0.79 · ใช้ได้ แต่ควรยืนยันข้อมูลสำคัญ",
    lowRange: "ต่ำกว่า 0.50 · ควรตรวจทานก่อนนำไปอ้างอิง",
    empty: "ยังไม่มีคะแนนความเชื่อมั่นในข้อมูลที่เลือก",
    on: "เปิดอยู่",
    off: "ปิดอยู่"
  }
};

const scopeLabels: Record<Scope, string> = {
  all: "All Pages",
  sources: "Internet Sources",
  robots: "Robot Registry",
  contributions: "Contributions",
  perspectives: "Perspectives",
  submissions: "Submissions"
};

const scopeOrder: Scope[] = ["sources", "robots", "contributions", "perspectives", "submissions", "all"];

const fieldCatalog: Record<Scope, Array<{ value: string; label: string }>> = {
  all: [
    { value: "eventType", label: "Event Type" },
    { value: "sourceType", label: "Source Type" },
    { value: "relevanceStatus", label: "Relevance Status" },
    { value: "platform", label: "Platform" },
    { value: "robotType", label: "Robot Type" },
    { value: "thailandStatus", label: "Thailand Status" },
    { value: "contributionType", label: "Contribution Type" },
    { value: "verificationStatus", label: "Review Status" },
    { value: "perspectiveTheme", label: "Perspective Theme" },
    { value: "stance", label: "Stance" },
    { value: "sentiment", label: "Sentiment" },
    { value: "submissionType", label: "Submission Type" },
    { value: "status", label: "Status" },
    { value: "visibility", label: "Visibility" }
  ],
  sources: [
    { value: "sourceType", label: "Source Type" },
    { value: "relevanceStatus", label: "Relevance Status" },
    { value: "platform", label: "Platform" }
  ],
  robots: [
    { value: "robotType", label: "Robot Type" },
    { value: "thailandStatus", label: "Thailand Status" },
    { value: "countryOfOrigin", label: "Country of Origin" }
  ],
  contributions: [
    { value: "contributionType", label: "Contribution Type" },
    { value: "verificationStatus", label: "Verification Status" },
    { value: "visibility", label: "Visibility" },
    { value: "ownerOrg", label: "Organization" }
  ],
  perspectives: [
    { value: "perspectiveTheme", label: "Perspective Theme" },
    { value: "stance", label: "Stance" },
    { value: "sentiment", label: "Sentiment" }
  ],
  submissions: [
    { value: "submissionType", label: "Submission Type" },
    { value: "status", label: "Status" }
  ]
};

const palette = ["#19523c", "#28744b", "#4f8b62", "#7fa87f", "#a9bea9", "#d4af37", "#c5931b", "#9c2e26", "#5e7568"];
const remainderLabel = "Remaining live categories";

function humanize(value: string) {
  return value.replace(/_/g, " ");
}

function seriesLabel(value: string) {
  return value === "unknown" || value === "n/a" ? value : humanize(value);
}

function normalizeDateKey(value: string | null, bucket: TimeBucket) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  if (bucket === "year") {
    return String(date.getFullYear());
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function getFieldValue(event: AnalyticsEvent, field: string) {
  switch (field) {
    case "eventType":
      return event.eventType;
    case "sourceType":
      return event.sourceType;
    case "relevanceStatus":
      return event.relevanceStatus;
    case "platform":
      return event.platform;
    case "robotType":
      return event.robotType;
    case "thailandStatus":
      return event.thailandStatus;
    case "contributionType":
      return event.contributionType;
    case "verificationStatus":
      return event.verificationStatus;
    case "perspectiveTheme":
      return event.perspectiveTheme;
    case "stance":
      return event.stance;
    case "sentiment":
      return event.sentiment;
    case "submissionType":
      return event.submissionType;
    case "status":
      return event.status;
    case "visibility":
      return event.visibility;
    case "countryOfOrigin":
      return event.countryOfOrigin;
    case "ownerOrg":
      return event.ownerOrg;
    default:
      return "unknown";
  }
}

function topValues(events: AnalyticsEvent[], field: string, limit = 6) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const value = getFieldValue(event, field) || "unknown";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value]) => value);
}

export default function AnalyticsPlayground({ events, lang }: AnalyticsPlaygroundProps) {
  const [scope, setScope] = useState<Scope>("sources");
  const [timeBucket, setTimeBucket] = useState<TimeBucket>("month");
  const [seriesField, setSeriesField] = useState("relevanceStatus");
  const [rowField, setRowField] = useState("sourceType");
  const [columnField, setColumnField] = useState("relevanceStatus");
  const [showConfidence, setShowConfidence] = useState(true);
  const confidenceT = confidenceCopy[lang];

  const scopeEvents = useMemo(() => {
    if (scope === "all") return events;
    return events.filter((event) => event.scope === scope);
  }, [events, scope]);

  const availableFields = fieldCatalog[scope];

  const trendSeriesField = availableFields.some((field) => field.value === seriesField)
    ? seriesField
    : availableFields[0]?.value || "eventType";
  const matrixRowField = availableFields.some((field) => field.value === rowField)
    ? rowField
    : availableFields[0]?.value || "eventType";
  const matrixColumnField = availableFields.some((field) => field.value === columnField)
    ? columnField
    : availableFields[1]?.value || matrixRowField;

  const trendTopValues = useMemo(() => topValues(scopeEvents, trendSeriesField), [scopeEvents, trendSeriesField]);
  const trendSeriesTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const event of scopeEvents) {
      const value = getFieldValue(event, trendSeriesField) || "unknown";
      totals.set(value, (totals.get(value) ?? 0) + 1);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }, [scopeEvents, trendSeriesField]);

  const trendRows = useMemo(() => {
    const byBucket = new Map<string, Record<string, number>>();

    for (const event of scopeEvents) {
      const timeKey = normalizeDateKey(event.date, timeBucket);
      const seriesValue = getFieldValue(event, trendSeriesField) || "unknown";
      const normalizedSeries = trendTopValues.includes(seriesValue) ? seriesValue : remainderLabel;

      if (!byBucket.has(timeKey)) {
        byBucket.set(timeKey, {});
      }
      const bucket = byBucket.get(timeKey)!;
      bucket[normalizedSeries] = (bucket[normalizedSeries] ?? 0) + 1;
    }

    return [...byBucket.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([timeKey, values]) => ({
        timeKey,
        ...values
      }));
  }, [scopeEvents, timeBucket, trendSeriesField, trendTopValues]);

  const trendKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of trendRows) {
      Object.keys(row).forEach((key) => {
        if (key !== "timeKey") keys.add(key);
      });
    }
    return [...keys];
  }, [trendRows]);

  const matrix = useMemo(() => {
    const rowLabels = topValues(scopeEvents, matrixRowField, 6);
    const colLabels = topValues(scopeEvents, matrixColumnField, 6);
    const counts = new Map<string, number>();

    for (const event of scopeEvents) {
      const rowValue = getFieldValue(event, matrixRowField) || "unknown";
      const colValue = getFieldValue(event, matrixColumnField) || "unknown";
      const rowKey = rowLabels.includes(rowValue) ? rowValue : remainderLabel;
      const colKey = colLabels.includes(colValue) ? colValue : remainderLabel;
      const key = `${rowKey}|||${colKey}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const normalizedRows = rowLabels.includes(remainderLabel) ? rowLabels : [...rowLabels, remainderLabel];
    const normalizedCols = colLabels.includes(remainderLabel) ? colLabels : [...colLabels, remainderLabel];

    const max = Math.max(1, ...counts.values());
    return {
      rowLabels: normalizedRows,
      colLabels: normalizedCols,
      counts,
      max
    };
  }, [scopeEvents, matrixRowField, matrixColumnField]);

  const confidenceLens = useMemo(() => {
    const values = scopeEvents
      .map((event) => event.confidence)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      .map((value) => Math.max(0, Math.min(1, value)));
    const total = values.length;
    const bands = [
      { key: "high", name: confidenceT.high, range: confidenceT.highRange, color: "#36825a", count: values.filter((value) => value >= 0.8).length },
      { key: "medium", name: confidenceT.medium, range: confidenceT.mediumRange, color: "#c58c30", count: values.filter((value) => value >= 0.5 && value < 0.8).length },
      { key: "low", name: confidenceT.low, range: confidenceT.lowRange, color: "#b84b3f", count: values.filter((value) => value < 0.5).length }
    ].map((band) => ({
      ...band,
      percent: total ? Math.round((band.count / total) * 100) : 0,
      valueLabel: total ? `${band.count} (${Math.round((band.count / total) * 100)}%)` : "0"
    }));
    const histogram = [
      { label: "0.00–0.19", color: "#b84b3f" },
      { label: "0.20–0.39", color: "#cc7250" },
      { label: "0.40–0.59", color: "#c58c30" },
      { label: "0.60–0.79", color: "#9c9c48" },
      { label: "0.80–1.00", color: "#36825a" }
    ].map((bin, index) => {
      const count = values.filter((value) => Math.min(4, Math.floor(value * 5)) === index).length;
      return { ...bin, count };
    });
    return {
      total,
      coverage: scopeEvents.length ? Math.round((total / scopeEvents.length) * 100) : 0,
      average: total ? values.reduce((sum, value) => sum + value, 0) / total : null,
      lowCount: bands[2].count,
      bands,
      histogram
    };
  }, [confidenceT, scopeEvents]);

  const summary = useMemo(() => {
    const withDates = scopeEvents.filter((event) => event.date && !Number.isNaN(new Date(event.date).getTime()));
    return {
      total: scopeEvents.length,
      dated: withDates.length,
      avgConfidence: confidenceLens.average,
      topSeries: trendSeriesTotals[0]?.[0] || "No live records",
      topRow: [...matrix.rowLabels].sort((a, b) => {
        const totalA = matrix.colLabels.reduce((sum, col) => sum + (matrix.counts.get(`${a}|||${col}`) ?? 0), 0);
        const totalB = matrix.colLabels.reduce((sum, col) => sum + (matrix.counts.get(`${b}|||${col}`) ?? 0), 0);
        return totalB - totalA;
      })[0] || "No live records"
    };
  }, [confidenceLens.average, matrix, scopeEvents, trendSeriesTotals]);

  return (
    <div style={{ display: "grid", gap: "16px" }}>
      <section className="panel motion-panel motion-pop">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <div>
            <div className="muted">Scope</div>
            <select value={scope} onChange={(e) => setScope(e.target.value as Scope)} style={{ width: "100%" }}>
              {scopeOrder.map((value) => (
                <option key={value} value={value}>{scopeLabels[value]}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="muted">Time bucket</div>
            <select value={timeBucket} onChange={(e) => setTimeBucket(e.target.value as TimeBucket)} style={{ width: "100%" }}>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </select>
          </div>
          <div>
            <div className="muted">Trend factor</div>
            <select value={trendSeriesField} onChange={(e) => setSeriesField(e.target.value)} style={{ width: "100%" }}>
              {availableFields.map((field) => (
                <option key={field.value} value={field.value}>{field.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="muted">Matrix row</div>
            <select value={matrixRowField} onChange={(e) => setRowField(e.target.value)} style={{ width: "100%" }}>
              {availableFields.map((field) => (
                <option key={field.value} value={field.value}>{field.label}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="muted">Matrix column</div>
            <select value={matrixColumnField} onChange={(e) => setColumnField(e.target.value)} style={{ width: "100%" }}>
              {availableFields.map((field) => (
                <option key={field.value} value={field.value}>{field.label}</option>
              ))}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "20px" }}>
            <input type="checkbox" checked={showConfidence} onChange={(e) => setShowConfidence(e.target.checked)} />
            <span className="muted">Confidence lens</span>
          </label>
        </div>
      </section>

      <div className="grid">
        <div className="panel motion-panel motion-pop">
          <div className="muted">Records in scope</div>
          <div className="stat">{summary.total}</div>
        </div>
        <div className="panel motion-panel motion-pop" style={{ animationDelay: "60ms" }}>
          <div className="muted">With usable dates</div>
          <div className="stat">{summary.dated}</div>
        </div>
        <div className="panel motion-panel motion-pop" style={{ animationDelay: "120ms" }}>
          <div className="muted">Average confidence</div>
          <div className="stat">{summary.avgConfidence === null ? "No live confidence" : summary.avgConfidence.toFixed(2)}</div>
        </div>
        <div className="panel motion-panel motion-pop" style={{ animationDelay: "180ms" }}>
          <div className="muted">Top trend factor</div>
          <div className="stat" style={{ fontSize: "18px" }}>{seriesLabel(summary.topSeries)}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "minmax(0, 1.35fr) minmax(0, 0.95fr)" }}>
        <section className="panel motion-panel motion-pop">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
            <div>
              <h2>Appearance Trend</h2>
              <div className="muted" style={{ fontSize: "12px" }}>
                Monthly or yearly record appearance across the selected scope.
              </div>
            </div>
            <div className="badge">{scopeLabels[scope]}</div>
          </div>

          <div style={{ width: "100%", height: 360, marginTop: "12px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendRows} margin={{ top: 10, right: 18, left: 0, bottom: 6 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8ded8" />
                <XAxis dataKey="timeKey" stroke="#56645c" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} stroke="#56645c" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: unknown) => [value as number, "Records"]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                {trendKeys.map((series, index) => (
                  <Area
                    key={series}
                    type="monotone"
                    dataKey={series}
                    stackId="1"
                    stroke={palette[index % palette.length]}
                    fill={palette[index % palette.length]}
                    fillOpacity={0.18}
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={650}
                  />
                ))}
                {trendRows.some((row) => remainderLabel in row) && (
                  <Area
                    type="monotone"
                    dataKey={remainderLabel}
                    stackId="1"
                    stroke="#7a8a80"
                    fill="#7a8a80"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive
                    animationDuration={650}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`panel motion-panel motion-pop ${styles.confidenceCard}`}>
          <div className={styles.confidenceIntro}>
            <div>
              <h2>{confidenceT.title}</h2>
              <p>{confidenceT.subtitle}</p>
            </div>
            <div className="badge">{showConfidence ? confidenceT.on : confidenceT.off}</div>
          </div>

          {showConfidence ? (
            confidenceLens.total ? <>
              <div className={styles.confidenceStats}>
                <div className={styles.confidenceStat}>
                  <span>{confidenceT.scored}</span>
                  <strong>{confidenceLens.total}</strong>
                  <small>{confidenceLens.coverage}% {confidenceT.coverage}</small>
                </div>
                <div className={styles.confidenceStat}>
                  <span>{confidenceT.average}</span>
                  <strong>{confidenceLens.average?.toFixed(2)}</strong>
                  <small>0.00 – 1.00</small>
                </div>
                <div className={`${styles.confidenceStat} ${styles.warn}`}>
                  <span>{confidenceT.review}</span>
                  <strong>{confidenceLens.lowCount}</strong>
                  <small>{confidenceT.reviewHint}</small>
                </div>
              </div>
              <div style={{ height: 190, width: "100%" }}>
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={confidenceLens.histogram} margin={{ top: 20, right: 6, left: -20, bottom: 2 }}>
                    <CartesianGrid stroke="#e1e8e2" strokeDasharray="3 3" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tick={{ fill: "#405448", fontSize: 10 }} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tick={{ fill: "#65756b", fontSize: 10 }} tickLine={false} width={30} />
                    <Tooltip formatter={(value: unknown) => [value as number, lang === "th" ? "รายการ" : "records"]} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {confidenceLens.histogram.map((bin) => <Cell fill={bin.color} key={bin.label} />)}
                      <LabelList dataKey="count" fill="#405448" fontSize={11} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className={styles.bandList}>
                {confidenceLens.bands.map((band) => (
                  <div className={styles.bandRow} key={band.key}>
                    <i aria-hidden="true" className={styles.bandDot} style={{ background: band.color }} />
                    <span><strong>{band.name}</strong><small>{band.range}</small></span>
                    <span className={styles.bandCount}>{band.count} · {band.percent}%</span>
                  </div>
                ))}
              </div>
            </> : <div className={styles.confidenceEmpty}>{confidenceT.empty}</div>
          ) : <div className={styles.confidenceEmpty}>{lang === "th" ? "เปิด Confidence Lens เพื่อดูสรุปคะแนน" : "Turn on Confidence Lens to inspect the score breakdown."}</div>}
        </section>
      </div>

      <section className="panel motion-panel motion-pop">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
          <div>
            <h2>Factor Matrix</h2>
            <div className="muted" style={{ fontSize: "12px" }}>
              Pair any two factors to surface combinations across the selected corpus slice.
            </div>
          </div>
          <div className="badge">{seriesLabel(matrixRowField)} × {seriesLabel(matrixColumnField)}</div>
        </div>

        <div style={{ overflowX: "auto", marginTop: "12px" }}>
          <table style={{ minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, zIndex: 1 }}>Row / Column</th>
                {matrix.colLabels.map((label) => (
                  <th key={label}>{seriesLabel(label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rowLabels.map((rowLabel) => (
                <tr key={rowLabel}>
                  <td style={{ position: "sticky", left: 0, background: "var(--surface)", fontWeight: 700 }}>
                    {seriesLabel(rowLabel)}
                  </td>
                  {matrix.colLabels.map((colLabel) => {
                    const count = matrix.counts.get(`${rowLabel}|||${colLabel}`) ?? 0;
                    const alpha = count > 0 ? Math.max(0.08, count / matrix.max) : 0;
                    return (
                      <td
                        key={`${rowLabel}-${colLabel}`}
                        style={{
                          background: count > 0 ? `rgba(25, 82, 60, ${alpha})` : "transparent",
                          textAlign: "center",
                          fontWeight: count > 0 ? 700 : 400
                        }}
                      >
                        {count || ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
