"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useData } from "@/components/admin/data";
import { AddButton, Badge, Check, ConfirmDialog, DataTable, Dialog, Field, FormActions, IconButton, PageHeader, useToast } from "@/components/admin/ui";
import { JOB_TYPES, PICKUP_SUGGESTIONS } from "@/lib/config";
import { formatDate, newId, rwf, todayISO } from "@/lib/format";
import type { DriverJob } from "@/lib/types";

type Row = { id: string; date: string; driverId?: string; service: string; pickup?: string; pickupTime?: string; customer: string; amount: number; paid: boolean; job?: DriverJob };

export default function DriverJobsPage() {
  const { jobs, bookings, drivers, cars, loading, save, remove } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<DriverJob | "new" | null>(null);
  const [deleting, setDeleting] = useState<DriverJob | null>(null);

  // Standalone jobs plus drivers attached to bookings, which are edited on the booking.
  const rows = useMemo<Row[]>(() => [
    ...jobs.map((j) => ({ id: j.id, date: j.date, driverId: j.driverId, service: j.type, pickup: j.pickup, pickupTime: j.pickupTime, customer: j.customer, amount: j.amount, paid: j.paid, job: j })),
    ...bookings.filter((b) => b.driverId && b.status !== "cancelled").map((b) => ({
      id: b.id, date: b.start, driverId: b.driverId, service: `With ${cars.find((c) => c.id === b.carId)?.name ?? "car"}`, pickup: b.pickup, pickupTime: b.pickupTime, customer: b.customer, amount: b.driverFee, paid: b.paid,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [jobs, bookings, cars]);

  if (loading) return <p className="a-loading">Loading...</p>;

  return (
    <>
      <PageHeader title="Driver jobs" subtitle="Drivers hired without a car, plus drivers added to bookings.">
        <AddButton label="Add driver job" onClick={() => setEditing("new")} />
      </PageHeader>

      <section className="a-card">
        <DataTable
          caption="Driver jobs"
          rows={rows}
          empty={<><p>No driver jobs yet.</p><AddButton label="Add driver job" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Date", render: (r) => formatDate(r.date) },
            { label: "Driver", render: (r) => drivers.find((d) => d.id === r.driverId)?.name ?? "Removed driver" },
            { label: "Service", render: (r) => r.service },
            { label: "Pick-up", render: (r) => r.pickup ? <>{r.pickup}{r.pickupTime && <span className="a-sub">at {r.pickupTime}</span>}</> : <span className="a-sub">Not recorded</span> },
            { label: "Customer", render: (r) => r.customer },
            { label: "Payment", render: (r) => <Badge tone={r.paid ? "good" : "bad"}>{r.paid ? "Paid" : "Unpaid"}</Badge> },
            { label: "Amount", align: "right", render: (r) => rwf(r.amount) },
            { label: "Actions", hideLabel: true, align: "right", render: (r) => r.job ? (
              <div className="a-row-actions">
                <IconButton icon="edit" label={`Edit job for ${r.customer}`} onClick={() => setEditing(r.job!)} />
                <IconButton icon="trash" danger label={`Delete job for ${r.customer}`} onClick={() => setDeleting(r.job!)} />
              </div>
            ) : <Link className="a-link" href="/admin/bookings">On booking</Link> },
          ]}
        />
      </section>

      <Dialog title={editing === "new" ? "Add driver job" : "Edit driver job"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <JobForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (j) => { await save("jobs", j); setEditing(null); toast("Driver job saved."); }}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this driver job?"
        message={deleting && `The job for ${deleting.customer} will be removed and its revenue taken out of your reports.`}
        confirmLabel="Delete job"
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await remove("jobs", deleting!.id); setDeleting(null); toast("Driver job deleted."); }}
      />
    </>
  );
}

function JobForm({ initial, onSave, onCancel }: { initial: DriverJob | null; onSave: (j: DriverJob) => Promise<void>; onCancel: () => void }) {
  const { drivers } = useData();
  const options = drivers.filter((d) => d.active || d.id === initial?.driverId);
  const [form, setForm] = useState({
    driverId: initial?.driverId ?? options[0]?.id ?? "",
    date: initial?.date ?? todayISO(),
    type: initial?.type ?? JOB_TYPES[0],
    pickup: initial?.pickup ?? "",
    pickupTime: initial?.pickupTime ?? "",
    customer: initial?.customer ?? "",
    amount: String(initial?.amount ?? ""),
    paid: initial?.paid ?? false,
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.driverId) next.driverId = "Add a driver first, then record the job.";
    if (!form.date) next.date = "Choose the date of the job.";
    if (!form.pickup.trim()) next.pickup = "Enter where the driver picks the customer up.";
    if (!form.pickupTime) next.pickupTime = "Enter what time the driver picks the customer up.";
    if (!form.customer.trim()) next.customer = "Enter the customer's name.";
    if (!(Number(form.amount) > 0)) next.amount = "Enter an amount above 0 RWF.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await onSave({ id: initial?.id ?? newId(), driverId: form.driverId, date: form.date, type: form.type, pickup: form.pickup.trim(), pickupTime: form.pickupTime, customer: form.customer.trim(), amount: Number(form.amount), paid: form.paid, notes: form.notes.trim() || undefined });
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <form className="a-form" onSubmit={submit} noValidate>
      <Field label="Driver" required error={errors.driverId}>
        {(p) => (
          <select {...p} className="a-input" value={form.driverId} onChange={(e) => set({ driverId: e.target.value })}>
            {options.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Pick-up date" required error={errors.date}>
        {(p) => <input {...p} className="a-input" type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />}
      </Field>
      <Field label="Service">
        {(p) => (
          <select {...p} className="a-input" value={form.type} onChange={(e) => set({ type: e.target.value })}>
            {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        )}
      </Field>
      <Field label="Pick-up location" required error={errors.pickup} hint="Drop-off can be agreed later.">
        {(p) => (
          <>
            <input {...p} className="a-input" list="jobPlaces" autoComplete="off" value={form.pickup} onChange={(e) => set({ pickup: e.target.value })} />
            <datalist id="jobPlaces">{PICKUP_SUGGESTIONS.map((x) => <option key={x} value={x} />)}</datalist>
          </>
        )}
      </Field>
      <Field label="Pick-up time" required error={errors.pickupTime}>
        {(p) => <input {...p} className="a-input" type="time" value={form.pickupTime} onChange={(e) => set({ pickupTime: e.target.value })} />}
      </Field>
      <Field label="Customer" required error={errors.customer}>
        {(p) => <input {...p} className="a-input" autoComplete="off" value={form.customer} onChange={(e) => set({ customer: e.target.value })} />}
      </Field>
      <Field label="Amount (RWF)" required error={errors.amount}>
        {(p) => <input {...p} className="a-input" type="number" min="0" step="1000" inputMode="numeric" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />}
      </Field>
      <div className="a-field a-field--center">
        <Check label="Customer has paid" checked={form.paid} onChange={(paid) => set({ paid })} />
      </div>
      <Field label="Notes" wide>
        {(p) => <textarea {...p} className="a-input" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
      </Field>
      <div className="a-field--wide"><FormActions onCancel={onCancel} submitLabel="Save job" error={formError} /></div>
    </form>
  );
}
