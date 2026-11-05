"use client";

import { useId, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compact, rwf } from "@/lib/format";
import { Segmented } from "./ui";

// Validated with the dataviz palette script (CVD, contrast) against white cards.
export const SERIES = {
  revenue: { label: "Revenue", color: "#B87F0A" },
  costs: { label: "Costs", color: "#1E78B0" },
  rentals: { label: "Car rentals", color: "#B87F0A" },
  driver: { label: "Driver services", color: "#7E57C2" },
} as const;

type SeriesKey = keyof typeof SERIES;
type Row = Record<string, string | number>;

const AXIS = { fontSize: 13, fill: "#5F5B52" };

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="a-tooltip">
      <p className="a-tooltip__title">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="a-tooltip__row">
          <span className="a-swatch" style={{ background: p.color }} aria-hidden="true" />
          {p.name}<strong>{rwf(p.value)}</strong>
        </p>
      ))}
    </div>
  );
}

function Legend({ series }: { series: SeriesKey[] }) {
  return (
    <ul className="a-legend">
      {series.map((s) => <li key={s}><span className="a-swatch" style={{ background: SERIES[s].color }} aria-hidden="true" />{SERIES[s].label}</li>)}
    </ul>
  );
}

// Card holding a chart with a Chart/Table switch, so the numbers are always readable.
export function ChartCard({ title, summary, className = "", table, children }: { title: string; summary: string; className?: string; table: { head: string[]; rows: (string | number)[][] }; children: React.ReactNode }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const titleId = useId();
  return (
    <section className={`a-card a-chart-card ${className}`} aria-labelledby={titleId}>
      <div className="a-chart-card__head">
        <h2 id={titleId}>{title}</h2>
        <Segmented label={`View of ${title}`} value={view} onChange={setView} options={[{ key: "chart", label: "Chart" }, { key: "table", label: "Table" }]} />
      </div>
      {view === "chart" ? (
        <div role="img" aria-label={summary}>{children}</div>
      ) : (
        <div className="a-chart-table">
          <table className="a-table a-table--plain">
            <thead><tr>{table.head.map((h, i) => <th key={h} scope="col" className={i > 0 ? "is-right" : ""}>{h}</th>)}</tr></thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={String(row[0])}>{row.map((cell, i) => <td key={i} className={i > 0 ? "is-right" : ""}>{typeof cell === "number" ? rwf(cell) : cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Monthly bars: side by side, or stacked when the parts add up to a whole.
export function MonthlyBars({ data, series, stacked }: { data: Row[]; series: SeriesKey[]; stacked?: boolean }) {
  return (
    <>
      <Legend series={series} />
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={2} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#EBE6DC" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "#DAD3C6" }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={compact} width={44} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(20 20 20 / 0.05)" }} />
          {series.map((s, i) => (
            <Bar key={s} dataKey={s} name={SERIES[s].label} fill={SERIES[s].color} maxBarSize={stacked ? 28 : 16} stackId={stacked ? "a" : undefined} stroke={stacked ? "#fff" : undefined} strokeWidth={stacked ? 2 : 0}
              radius={!stacked || i === series.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// Ranked horizontal bars with the value written at the end of each bar.
export function RankedBars({ data, series }: { data: { name: string; value: number }[]; series: SeriesKey }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44 + 8)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, bottom: 4, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={136} tick={AXIS} tickLine={false} axisLine={false} interval={0} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(20 20 20 / 0.05)" }} />
        <Bar dataKey="value" name={SERIES[series].label} fill={SERIES[series].color} radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList dataKey="value" position="right" formatter={(v: unknown) => compact(Number(v))} style={{ fontSize: 13, fill: "#141414", fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
