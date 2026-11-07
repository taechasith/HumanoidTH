import type { ReactNode } from "react";

type Datum = { label: string; value: number };
type Confidence = { high: number; moderate: number; low: number };

const palette = ["#2f6b4f", "#5aa179", "#86c5a0", "#d7a84d", "#8b72bb", "#87a8cb", "#b4c0b8"];

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="chart-card"><div><h2>{title}</h2><p>{description}</p></div>{children}</section>;
}

function HorizontalBars({ data }: { data: Datum[] }) {
  const largest = Math.max(...data.map((item) => item.value), 1);
  return <div className="css-bar-list">{data.map((item) => <div className="css-bar" key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.value / largest * 100}%` }} /></div><strong>{item.value.toLocaleString()}</strong></div>)}</div>;
}

function Donut({ data }: { data: Datum[] }) {
  const total = data.reduce((count, item) => count + item.value, 0) || 1;
  let cursor = 0;
  const stops = data.map((item, index) => { const end = cursor + item.value / total * 100; const stop = `${palette[index % palette.length]} ${cursor}% ${end}%`; cursor = end; return stop; });
  return <div className="donut-wrap"><div className="css-donut" style={{ background: `conic-gradient(${stops.join(",")})` }}><span>{total.toLocaleString()}<small>Total</small></span></div><ul className="chart-legend">{data.slice(0, 6).map((item, index) => <li key={item.label}><span style={{ background: palette[index % palette.length] }} />{item.label}<strong>{item.value}</strong></li>)}</ul></div>;
}

function ConfidenceBar({ title, data }: { title: string; data: Confidence }) {
  const total = data.high + data.moderate + data.low;
  const percent = (value: number) => total ? `${(value / total * 100).toFixed(1)}%` : "0%";
  return <div className="confidence-block"><div className="confidence-title"><strong>{title}</strong><span>{total.toLocaleString()} records</span></div><div className="stacked-confidence" aria-label={`${title} confidence distribution`}><span className="high" style={{ width: percent(data.high) }}>{data.high > 0 && percent(data.high)}</span><span className="moderate" style={{ width: percent(data.moderate) }}>{data.moderate > 0 && percent(data.moderate)}</span><span className="low" style={{ width: percent(data.low) }}>{data.low > 0 && percent(data.low)}</span></div></div>;
}

export default function DashboardCharts({ composition, sourceTypes, origins, contributionTypes, embodimentLevels, themes, perspectiveConfidence, sourceConfidence }: { composition: Datum[]; sourceTypes: Datum[]; origins: Datum[]; contributionTypes: Datum[]; embodimentLevels: Datum[]; themes: Datum[]; perspectiveConfidence: Confidence; sourceConfidence: Confidence; }) {
  return <div className="dashboard-charts"><div className="chart-grid chart-grid--two"><ChartCard title="Ecosystem composition" description="Robots grouped by use context."><HorizontalBars data={composition} /></ChartCard><ChartCard title="Source record types" description="Web is shown alongside smaller source types."><HorizontalBars data={sourceTypes} /></ChartCard></div><div className="chart-grid chart-grid--three"><ChartCard title="Robot origin" description="Country of origin for registered models."><Donut data={origins} /></ChartCard><ChartCard title="Contribution types" description="Verified and pending work by contribution type."><Donut data={contributionTypes} /></ChartCard><ChartCard title="Embodiment levels" description="Grouped physical forms represented in the registry."><Donut data={embodimentLevels} /></ChartCard></div><div className="chart-grid chart-grid--two"><ChartCard title="Perspective analysis" description="Themes from reviewed public records."><HorizontalBars data={themes} /></ChartCard><ChartCard title="Data quality" description="High: 0.8+, moderate: 0.5-0.79, low: below 0.5."><ConfidenceBar title="Perspective confidence" data={perspectiveConfidence} /><ConfidenceBar title="Source relevance confidence" data={sourceConfidence} /><div className="confidence-legend"><span><i className="high" />High</span><span><i className="moderate" />Moderate</span><span><i className="low" />Low</span></div></ChartCard></div></div>;
}
