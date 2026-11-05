"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/admin/data";
import { AddButton, Badge, ConfirmDialog, DataTable, Dialog, Field, FormActions, IconButton, PageHeader, SearchBox, Segmented, Stat, ViewDialog, useToast, type Tone } from "@/components/admin/ui";
import { COST_LABELS } from "@/lib/config";
import { formatDate, matchesSearch, newId, rwf, todayISO } from "@/lib/format";
import { PERIODS, inRange, periodRange, sum, type PeriodKey } from "@/lib/metrics";
import type { Cost, CostCategory } from "@/lib/types";

const TONE: Record<CostCategory, Tone> = { fuel: "info", repair: "warn", other: "muted" };
const CATEGORIES = Object.keys(COST_LABELS) as CostCategory[];

export default function CostsPage() {
  const { costs, cars, loading, save, remove } = useData();
  const toast = useToast();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [category, setCategory] = useState<"all" | CostCategory>("all");
  const [editing, setEditing] = useState<Cost | "new" | null>(null);
  const [deleting, setDeleting] = useState<Cost | null>(null);
  const [viewing, setViewing] = useState<Cost | null>(null);
  const [search, setSearch] = useState("");
  const today = todayISO();

  const inPeriod = useMemo(() => {
    const { start, end } = periodRange(today, PERIODS.find((p) => p.key === period)!.months);
    return costs.filter((c) => inRange(c.date, start, end)).sort((a, b) => b.date.localeCompare(a.date));
  }, [costs, period, today]);

  const rows = inPeriod
    .filter((c) => category === "all" || c.category === category)
    .filter((c) => {
      const car = cars.find((x) => x.id === c.carId);
      return matchesSearch(search, [c.description, car?.name ?? "General", car?.plate, COST_LABELS[c.category], formatDate(c.date)]);
    });

  if (loading) return <p className="a-loading">Loading...</p>;

  return (
    <>
      <PageHeader title="Costs" subtitle="Fuel, repairs and anything else the business pays for.">
        <AddButton label="Add cost" onClick={() => setEditing("new")} />
      </PageHeader>

      <div className="a-toolbar">
        <Segmented label="Reporting period" value={period} onChange={setPeriod} options={PERIODS.map((p) => ({ key: p.key, label: p.label }))} />
        <Segmented label="Filter by type" value={category} onChange={setCategory} options={[{ key: "all", label: "All types" }, ...CATEGORIES.map((c) => ({ key: c, label: COST_LABELS[c] }))]} />
      </div>

      <div className="a-stats">
        <Stat label="Total" value={rwf(sum(inPeriod, (c) => c.amount))} />
        {CATEGORIES.map((c) => <Stat key={c} label={COST_LABELS[c]} value={rwf(sum(inPeriod.filter((x) => x.category === c), (x) => x.amount))} />)}
      </div>

      <div className="a-toolbar">
        <SearchBox label="Search costs" placeholder="Search description, car or type" value={search} onChange={setSearch} count={rows.length} />
      </div>

      <section className="a-card">
        <DataTable
          caption="Costs"
          rows={rows}
          empty={<><p>{search.trim() ? `No costs match "${search.trim()}" in this period.` : "No costs recorded for this selection."}</p><AddButton label="Add cost" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Date", sort: (c) => c.date, render: (c) => formatDate(c.date) },
            { label: "Type", render: (c) => <Badge tone={TONE[c.category]}>{COST_LABELS[c.category]}</Badge> },
            { label: "Description and car", render: (c) => <>{c.description}<span className="a-sub">{c.carId ? cars.find((x) => x.id === c.carId)?.name ?? "Removed car" : "General"}</span></> },
            { label: "Amount", align: "right", sort: (c) => c.amount, render: (c) => rwf(c.amount) },
            { label: "Actions", hideLabel: true, align: "right", render: (c) => (
              <div className="a-row-actions">
                <IconButton icon="eye" label={`View cost: ${c.description}`} onClick={() => setViewing(c)} />
                <IconButton icon="edit" label={`Edit cost: ${c.description}`} onClick={() => setEditing(c)} />
              </div>
            ) },
          ]}
        />
      </section>

      <ViewDialog
        title="Cost details"
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setViewing(null); }}
        sections={viewing ? [
          { title: "Cost", items: [["Date", formatDate(viewing.date)], ["Type", COST_LABELS[viewing.category]], ["Description", viewing.description], ["Car", viewing.carId ? cars.find((c) => c.id === viewing.carId)?.name ?? "Removed car" : "General"], ["Amount", rwf(viewing.amount)]] },
        ] : []}
      />

      <Dialog title={editing === "new" ? "Add cost" : "Edit cost"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <CostForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onDelete={editing === "new" ? undefined : () => { setDeleting(editing); setEditing(null); }}
            onSave={async (c) => { await save("costs", c); setEditing(null); toast("Cost saved."); }}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this cost?"
        message={deleting && `"${deleting.description}" (${rwf(deleting.amount)}) will be removed from your reports.`}
        confirmLabel="Delete cost"
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await remove("costs", deleting!.id); setDeleting(null); toast("Cost deleted."); }}
      />
    </>
  );
}

function CostForm({ initial, onSave, onCancel, onDelete }: { initial: Cost | null; onSave: (c: Cost) => Promise<void>; onCancel: () => void; onDelete?: () => void }) {
  const { cars } = useData();
  const [form, setForm] = useState({
    date: initial?.date ?? todayISO(),
    category: (initial?.category ?? "fuel") as CostCategory,
    carId: initial?.carId ?? "",
    description: initial?.description ?? "",
    amount: String(initial?.amount ?? ""),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.date) next.date = "Choose the date of the cost.";
    else if (form.date > todayISO()) next.date = "A cost can't be in the future. Enter it on the day you pay it.";
    if (!form.description.trim()) next.description = "Say what it was for, e.g. New tyres.";
    if (!(Number(form.amount) > 0)) next.amount = "Enter an amount above 0 RWF.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await onSave({ id: initial?.id ?? newId(), date: form.date, category: form.category, carId: form.carId || undefined, description: form.description.trim(), amount: Number(form.amount) });
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <form className="a-form" onSubmit={submit} noValidate>
      <Field label="Date" required error={errors.date}>
        {(p) => <input {...p} className="a-input" type="date" max={todayISO()} value={form.date} onChange={(e) => set({ date: e.target.value })} />}
      </Field>
      <Field label="Type">
        {(p) => (
          <select {...p} className="a-input" value={form.category} onChange={(e) => set({ category: e.target.value as CostCategory })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{COST_LABELS[c]}</option>)}
          </select>
        )}
      </Field>
      <Field label="Car" hint="Leave as General if it isn't for one car.">
        {(p) => (
          <select {...p} className="a-input" value={form.carId} onChange={(e) => set({ carId: e.target.value })}>
            <option value="">General</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.plate}</option>)}
          </select>
        )}
      </Field>
      <Field label="Amount (RWF)" required error={errors.amount}>
        {(p) => <input {...p} className="a-input" type="number" min="0" step="500" inputMode="numeric" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />}
      </Field>
      <Field label="Description" required wide error={errors.description}>
        {(p) => <input {...p} className="a-input" autoComplete="off" value={form.description} onChange={(e) => set({ description: e.target.value })} />}
      </Field>
      <div className="a-field--wide"><FormActions onCancel={onCancel} onDelete={onDelete} submitLabel="Save cost" error={formError} /></div>
    </form>
  );
}
