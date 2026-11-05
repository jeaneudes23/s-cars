"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChartCard, MonthlyBars, RankedBars } from "@/components/admin/charts";
import { useData } from "@/components/admin/data";
import { Badge, DataTable, PageHeader, Segmented, Stat } from "@/components/admin/ui";
import { COST_LABELS } from "@/lib/config";
import { addDays, formatDate, rwf, todayISO } from "@/lib/format";
import { PERIODS, bookingTotal, inRange, monthlySeries, periodRange, revenueEntries, sum, type PeriodKey } from "@/lib/metrics";
import type { CostCategory } from "@/lib/types";

function change(current: number, previous: number) {
  if (previous <= 0) return undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? "Up" : "Down"} ${Math.abs(pct)}% on the previous period`;
}

export default function DashboardPage() {
  const { cars, drivers, bookings, jobs, costs, loading } = useData();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const today = todayISO();
  const months = PERIODS.find((p) => p.key === period)!.months;

  const view = useMemo(() => {
    const { start, end, prevStart, prevEnd } = periodRange(today, months);
    const entries = revenueEntries(bookings, jobs, cars, drivers);
    const current = entries.filter((e) => inRange(e.date, start, end));
    const paid = current.filter((e) => e.paid);
    const periodCosts = costs.filter((c) => inRange(c.date, start, end));

    const revenue = sum(paid, (e) => e.amount);
    const spent = sum(periodCosts, (c) => c.amount);
    const prevRevenue = sum(entries.filter((e) => e.paid && inRange(e.date, prevStart, prevEnd)), (e) => e.amount);
    const prevSpent = sum(costs.filter((c) => inRange(c.date, prevStart, prevEnd)), (c) => c.amount);
    const owed = entries.filter((e) => !e.paid && e.date <= today);

    const carRevenue = cars
      .map((car) => ({ name: car.name, value: sum(paid.filter((e) => e.carId === car.id), (e) => e.amount) }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);

    const costByCategory = (Object.keys(COST_LABELS) as CostCategory[])
      .map((key) => ({ name: COST_LABELS[key], value: sum(periodCosts.filter((c) => c.category === key), (c) => c.amount) }))
      .sort((a, b) => b.value - a.value);

    const carName = (id: string) => cars.find((c) => c.id === id)?.name ?? "Removed car";
    const upcoming = [
      ...bookings.filter((b) => b.status === "booked").flatMap((b) => {
        const shared = { service: "Self-drive", car: carName(b.carId), customer: b.customer, total: bookingTotal(b), place: undefined as string | undefined, time: undefined as string | undefined };
        return [{ ...shared, id: `${b.id}-out`, date: b.start, what: "Pick-up" }, { ...shared, id: `${b.id}-back`, date: b.end, what: "Return" }];
      }),
      ...jobs.map((j) => ({ id: j.id, date: j.date, time: j.pickupTime, what: "Pick-up", service: j.type, car: j.carId ? carName(j.carId) : "No car recorded", customer: j.customer, place: j.pickup, total: j.amount })),
    ]
      .filter((m) => m.date >= today && m.date <= addDays(today, 7))
      // Within a day: pick-ups by time, then returns.
      .sort((a, b) => `${a.date}${a.what === "Pick-up" ? a.time ?? "00:00" : "99"}`.localeCompare(`${b.date}${b.what === "Pick-up" ? b.time ?? "00:00" : "99"}`));

    const bookingCount = bookings.filter((b) => b.status !== "cancelled" && inRange(b.start, start, end)).length;

    return {
      revenue, spent, prevRevenue, prevSpent, carRevenue, costByCategory, upcoming, bookingCount,
      owed: sum(owed, (e) => e.amount),
      owedCount: new Set(owed.map((e) => e.ref.id)).size,
      monthly: monthlySeries(today, Math.max(months, 6), entries, costs),
    };
  }, [bookings, jobs, cars, drivers, costs, months, today]);

  if (loading) return <p className="a-loading">Loading...</p>;

  const profit = view.revenue - view.spent;
  const monthCount = view.monthly.length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${view.bookingCount} bookings in this period`}>
        <Segmented label="Reporting period" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ key: p.key, label: p.label }))} />
      </PageHeader>

      <div className="a-stats">
        <Stat label="Revenue (paid)" value={rwf(view.revenue)} note={change(view.revenue, view.prevRevenue)} />
        <Stat label="Costs" value={rwf(view.spent)} note={change(view.spent, view.prevSpent)} />
        <Stat label="Profit" value={rwf(profit)} note={change(profit, view.prevRevenue - view.prevSpent)} />
        <Stat label="Unpaid" value={rwf(view.owed)} note={`${view.owedCount} ${view.owedCount === 1 ? "record" : "records"} waiting for payment`} />
      </div>

      <div className="a-chart-grid">
        <ChartCard
          className="a-span-2"
          title={`Revenue and costs, last ${monthCount} months`}
          summary={`Monthly revenue compared with costs for the last ${monthCount} months.`}
          table={{ head: ["Month", "Revenue", "Costs"], rows: view.monthly.map((m) => [m.label, m.revenue, m.costs]) }}
        >
          <MonthlyBars data={view.monthly} series={["revenue", "costs"]} />
        </ChartCard>

        <ChartCard
          title="Costs by type"
          summary={view.costByCategory.map((c) => `${c.name} ${rwf(c.value)}`).join(", ")}
          table={{ head: ["Type", "Amount"], rows: view.costByCategory.map((c) => [c.name, c.value]) }}
        >
          <RankedBars data={view.costByCategory} series="costs" />
        </ChartCard>

        <ChartCard
          title="Revenue by car"
          summary={`Paid revenue per car, from bookings and driver services. Highest: ${view.carRevenue[0]?.name ?? "none"}.`}
          table={{ head: ["Car", "Revenue"], rows: view.carRevenue.map((c) => [c.name, c.value]) }}
        >
          {view.carRevenue.length ? <RankedBars data={view.carRevenue} series="revenue" /> : <p className="a-chart-empty">No paid rentals in this period.</p>}
        </ChartCard>

        <ChartCard
          className="a-span-2"
          title={`Revenue by source, last ${monthCount} months`}
          summary="Monthly revenue split between car rentals and driver services."
          table={{ head: ["Month", "Car rentals", "Driver services"], rows: view.monthly.map((m) => [m.label, m.rentals, m.driver]) }}
        >
          <MonthlyBars data={view.monthly} series={["rentals", "driver"]} stacked />
        </ChartCard>
      </div>

      <section className="a-card a-section">
        <div className="a-section__head">
          <h2>Next 7 days</h2>
          <Link href="/admin/bookings" className="a-link">All bookings</Link>
        </div>
        <DataTable
          caption="Pick-ups, returns and driver services in the next 7 days"
          rows={view.upcoming}
          empty={<p>Nothing scheduled in the next 7 days.</p>}
          columns={[
            { label: "Date and type", sort: (m) => `${m.date}${m.what === "Pick-up" ? m.time ?? "00:00" : "99"}`, render: (m) => (
              <div className="a-stack">
                <span className="a-nowrap">{formatDate(m.date)}{m.time && ` at ${m.time}`}</span>
                <Badge tone={m.what === "Pick-up" ? "info" : "muted"}>{m.what}</Badge>
              </div>
            ) },
            { label: "Customer and car", render: (m) => <><strong>{m.customer}</strong><span className="a-line">{m.car}</span><span className="a-sub">{m.service}</span></> },
            { label: "Pick-up location", render: (m) => m.place || "-" },
            { label: "Total", align: "right", sort: (m) => m.total, render: (m) => rwf(m.total) },
          ]}
        />
      </section>
    </>
  );
}
