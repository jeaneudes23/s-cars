"use client";

import { useMemo, useState } from "react";
import { ChartCard, MonthlyBars } from "@/components/admin/charts";
import { useData } from "@/components/admin/data";
import { Badge, DataTable, IconButton, PageHeader, SearchBox, Segmented, Stat, ViewDialog } from "@/components/admin/ui";
import { formatDate, matchesSearch, rwf, todayISO } from "@/lib/format";
import { PERIODS, inRange, monthlySeries, periodRange, revenueEntries, sum, type PeriodKey, type RevenueEntry, type RevenueSource } from "@/lib/metrics";

const SOURCE_LABEL: Record<RevenueSource, string> = { rental: "Car rental", driver: "Driver service" };

export default function RevenuePage() {
  const { bookings, jobs, cars, drivers, costs, loading } = useData();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [source, setSource] = useState<"all" | RevenueSource>("all");
  const [payment, setPayment] = useState<"all" | "paid" | "unpaid">("all");
  const [viewing, setViewing] = useState<RevenueEntry | null>(null);
  const [search, setSearch] = useState("");
  const today = todayISO();
  const months = PERIODS.find((p) => p.key === period)!.months;

  const { entries, inPeriod, monthly } = useMemo(() => {
    const all = revenueEntries(bookings, jobs, cars, drivers);
    const { start, end } = periodRange(today, months);
    return {
      entries: all,
      inPeriod: all.filter((e) => inRange(e.date, start, end)),
      monthly: monthlySeries(today, Math.max(months, 6), all, costs),
    };
  }, [bookings, jobs, cars, drivers, costs, months, today]);

  if (loading) return <p className="a-loading">Loading...</p>;

  const paid = inPeriod.filter((e) => e.paid);
  const unpaid = inPeriod.filter((e) => !e.paid);
  const rows = inPeriod
    .filter((e) => source === "all" || e.source === source)
    .filter((e) => payment === "all" || (payment === "paid") === e.paid)
    .filter((e) => matchesSearch(search, [e.customer, e.description, SOURCE_LABEL[e.source], formatDate(e.date)]));

  return (
    <>
      <PageHeader title="Revenue" subtitle={`${entries.length} income records in total. Only paid records count as revenue.`}>
        <Segmented label="Reporting period" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ key: p.key, label: p.label }))} />
      </PageHeader>

      <div className="a-stats">
        <Stat label="Revenue (paid)" value={rwf(sum(paid, (e) => e.amount))} />
        <Stat label="Car rentals" value={rwf(sum(paid.filter((e) => e.source === "rental"), (e) => e.amount))} />
        <Stat label="Driver services" value={rwf(sum(paid.filter((e) => e.source === "driver"), (e) => e.amount))} />
        <Stat label="Unpaid" value={rwf(sum(unpaid, (e) => e.amount))} />
      </div>

      <div className="a-chart-grid a-chart-grid--one">
        <ChartCard
          title={`Revenue by source, last ${monthly.length} months`}
          summary="Monthly revenue split between car rentals and driver services."
          table={{ head: ["Month", "Car rentals", "Driver services"], rows: monthly.map((m) => [m.label, m.rentals, m.driver]) }}
        >
          <MonthlyBars data={monthly} series={["rentals", "driver"]} stacked />
        </ChartCard>
      </div>

      <div className="a-toolbar">
        <Segmented label="Filter by source" value={source} onChange={setSource} options={[{ key: "all", label: "All sources" }, { key: "rental", label: "Car rentals" }, { key: "driver", label: "Driver services" }]} />
        <Segmented label="Filter by payment" value={payment} onChange={setPayment} options={[{ key: "all", label: "All" }, { key: "paid", label: "Paid" }, { key: "unpaid", label: "Unpaid" }]} />
        <SearchBox label="Search income" placeholder="Search customer, car or driver" value={search} onChange={setSearch} count={rows.length} />
      </div>

      <section className="a-card">
        <DataTable
          caption="Income records"
          rows={rows}
          empty={<p>{search.trim() ? `No income matches "${search.trim()}" in this period.` : "No income records for this selection."}</p>}
          columns={[
            { label: "Date", sort: (e) => e.date, render: (e) => formatDate(e.date) },
            { label: "Customer and details", render: (e) => (
              <>
                <strong>{e.customer}</strong>
                <span className="a-line">{e.description}</span>
                <span className="a-sub">{SOURCE_LABEL[e.source]}</span>
              </>
            ) },
            { label: "Amount and payment", align: "right", sort: (e) => e.amount, render: (e) => (
              <div className="a-amount">
                {rwf(e.amount)}
                <Badge tone={e.paid ? "good" : "bad"}>{e.paid ? "Paid" : "Unpaid"}</Badge>
              </div>
            ) },
            { label: "Actions", hideLabel: true, align: "right", render: (e) => <IconButton icon="eye" label={`View income from ${e.customer}`} onClick={() => setViewing(e)} /> },
          ]}
        />
      </section>

      <ViewDialog
        title="Income details"
        open={!!viewing}
        onClose={() => setViewing(null)}
        sections={viewing ? [
          { title: "Income", items: [["Date", formatDate(viewing.date)], ["Source", SOURCE_LABEL[viewing.source]], ["Customer", viewing.customer], ["Details", viewing.description], ["Amount", rwf(viewing.amount)], ["Payment", viewing.paid ? "Paid" : "Unpaid"]] },
        ] : []}
      />
    </>
  );
}
