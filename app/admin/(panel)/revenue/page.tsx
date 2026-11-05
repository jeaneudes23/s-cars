"use client";

import { useMemo, useState } from "react";
import { ChartCard, MonthlyBars } from "@/components/admin/charts";
import { useData } from "@/components/admin/data";
import { Badge, DataTable, PageHeader, Segmented, Stat, useToast } from "@/components/admin/ui";
import { formatDate, rwf, todayISO } from "@/lib/format";
import { PERIODS, inRange, monthlySeries, periodRange, revenueEntries, sum, type PeriodKey, type RevenueEntry, type RevenueSource } from "@/lib/metrics";

const SOURCE_LABEL: Record<RevenueSource, string> = { rental: "Car rental", driver: "Driver service" };

export default function RevenuePage() {
  const { bookings, jobs, cars, drivers, costs, loading, save } = useData();
  const toast = useToast();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [source, setSource] = useState<"all" | RevenueSource>("all");
  const [payment, setPayment] = useState<"all" | "paid" | "unpaid">("all");
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
    .filter((e) => payment === "all" || (payment === "paid") === e.paid);

  // A booking is paid as a whole, so this also flips its driver line.
  async function togglePaid(entry: RevenueEntry) {
    if (entry.ref.kind === "booking") {
      const booking = bookings.find((b) => b.id === entry.ref.id);
      if (booking) await save("bookings", { ...booking, paid: !entry.paid });
    } else {
      const job = jobs.find((j) => j.id === entry.ref.id);
      if (job) await save("jobs", { ...job, paid: !entry.paid });
    }
    toast(entry.paid ? "Marked as unpaid." : "Marked as paid.");
  }

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
      </div>

      <section className="a-card">
        <DataTable
          key={`${period}-${source}-${payment}`}
          caption="Income records"
          rows={rows}
          empty={<p>No income records for this selection.</p>}
          columns={[
            { label: "Date", render: (e) => formatDate(e.date) },
            { label: "Source", render: (e) => SOURCE_LABEL[e.source] },
            { label: "Details", render: (e) => e.description },
            { label: "Customer", render: (e) => e.customer },
            { label: "Payment", render: (e) => <Badge tone={e.paid ? "good" : "bad"}>{e.paid ? "Paid" : "Unpaid"}</Badge> },
            { label: "Amount", align: "right", render: (e) => rwf(e.amount) },
            { label: "Actions", hideLabel: true, align: "right", render: (e) => (
              <button type="button" className="btn a-btn-ghost a-btn-sm" onClick={() => togglePaid(e)}>{e.paid ? "Mark unpaid" : "Mark paid"}</button>
            ) },
          ]}
        />
      </section>
    </>
  );
}
