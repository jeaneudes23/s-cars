"use client";

import { useMemo, useState } from "react";
import { useData, useQuickSave } from "@/components/admin/data";
import { AddButton, Badge, Check, ConfirmDialog, DataTable, Dialog, Field, FormActions, FormSection, IconButton, PAYMENT_OPTIONS, PageHeader, SearchBox, StatusMenu, ViewDialog, useToast } from "@/components/admin/ui";
import { JOB_TYPES, PICKUP_SUGGESTIONS } from "@/lib/config";
import { formatDate, matchesSearch, newId, rwf, todayISO } from "@/lib/format";
import { carClash } from "@/lib/metrics";
import type { DriverJob } from "@/lib/types";

export default function DriverServicesPage() {
  const { jobs, drivers, cars, loading, save, remove } = useData();
  const toast = useToast();
  const quickSave = useQuickSave();
  const [editing, setEditing] = useState<DriverJob | "new" | null>(null);
  const [deleting, setDeleting] = useState<DriverJob | null>(null);
  const [viewing, setViewing] = useState<DriverJob | null>(null);
  const carOf = (j: DriverJob) => cars.find((c) => c.id === j.carId);

  const [search, setSearch] = useState("");

  const rows = useMemo(() => jobs
    .filter((j) => matchesSearch(search, [j.customer, j.phone, drivers.find((d) => d.id === j.driverId)?.name, carOf(j)?.name, carOf(j)?.plate, j.pickup, j.type, formatDate(j.date), j.notes]))
    .sort((a, b) => b.date.localeCompare(a.date)),
    [jobs, drivers, cars, search]);

  if (loading) return <p className="a-loading">Loading...</p>;

  return (
    <>
      <PageHeader title="Driver services" subtitle="A driver and one of your cars, hired by a customer.">
        <AddButton label="Add driver service" onClick={() => setEditing("new")} />
      </PageHeader>

      <div className="a-toolbar">
        <SearchBox label="Search driver services" placeholder="Search customer, driver, car or place" value={search} onChange={setSearch} count={rows.length} />
      </div>

      <section className="a-card">
        <DataTable
          caption="Driver services"
          rows={rows}
          empty={<><p>{search.trim() ? `No driver services match "${search.trim()}".` : "No driver services yet."}</p><AddButton label="Add driver service" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Pick-up and driver", sort: (j) => `${j.date}${j.pickupTime ?? ""}`, render: (j) => (
              <>
                <span className="a-line a-nowrap">{formatDate(j.date)}{j.pickupTime && ` at ${j.pickupTime}`}</span>
                <span className="a-sub">{j.pickup || "Location not recorded"}</span>
                <span className="a-sub">{j.type} with {drivers.find((d) => d.id === j.driverId)?.name ?? "removed driver"}</span>
              </>
            ) },
            { label: "Customer and car", render: (j) => (
              <>
                <strong>{j.customer}</strong>
                <span className="a-line">{j.carId ? cars.find((c) => c.id === j.carId)?.name ?? "Removed car" : "No car recorded"}</span>
                {j.phone && <span className="a-sub">{j.phone}</span>}
              </>
            ) },
            { label: "Amount and payment", align: "right", sort: (j) => j.amount, render: (j) => (
              <div className="a-amount">
                {rwf(j.amount)}
                <StatusMenu label={`Payment for ${j.customer}`} text={j.paid ? "Paid" : "Unpaid"} tone={j.paid ? "good" : "bad"} value={j.paid ? "paid" : "unpaid"} options={PAYMENT_OPTIONS} onChange={(v) => quickSave("jobs", { ...j, paid: v === "paid" }, `${j.customer}: ${v === "paid" ? "Paid" : "Unpaid"}`)} />
              </div>
            ) },
            { label: "Actions", hideLabel: true, align: "right", render: (j) => (
              <div className="a-row-actions">
                <IconButton icon="eye" label={`View service for ${j.customer}`} onClick={() => setViewing(j)} />
                <IconButton icon="edit" label={`Edit service for ${j.customer}`} onClick={() => setEditing(j)} />
              </div>
            ) },
          ]}
        />
      </section>

      <ViewDialog
        title="Driver service details"
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setViewing(null); }}
        sections={viewing ? [
          { title: "Customer", items: [["Name", viewing.customer], ["Phone", viewing.phone]] },
          { title: "Pick-up", items: [["Date", formatDate(viewing.date)], ["Time", viewing.pickupTime], ["Location", viewing.pickup]] },
          { title: "Driver and car", items: [["Driver", drivers.find((d) => d.id === viewing.driverId)?.name], ["Type of service", viewing.type], ["Car", carOf(viewing)?.name], ["Number plate", carOf(viewing)?.plate]] },
          { title: "Payment", items: [["Amount", rwf(viewing.amount)], ["Payment", viewing.paid ? "Paid" : "Unpaid"], ["Notes", viewing.notes]] },
        ] : []}
      />

      <Dialog title={editing === "new" ? "Add driver service" : "Edit driver service"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <JobForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onDelete={editing === "new" ? undefined : () => { setDeleting(editing); setEditing(null); }}
            onSave={async (j) => { await save("jobs", j); setEditing(null); toast("Driver service saved."); }}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this driver service?"
        message={deleting && `The service for ${deleting.customer} will be removed and its revenue taken out of your reports.`}
        confirmLabel="Delete service"
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await remove("jobs", deleting!.id); setDeleting(null); toast("Driver service deleted."); }}
      />
    </>
  );
}

function JobForm({ initial, onSave, onCancel, onDelete }: { initial: DriverJob | null; onSave: (j: DriverJob) => Promise<void>; onCancel: () => void; onDelete?: () => void }) {
  const { drivers, cars, bookings, jobs } = useData();
  const options = drivers.filter((d) => d.active || d.id === initial?.driverId);
  const [form, setForm] = useState({
    driverId: initial?.driverId ?? "",
    carId: initial?.carId ?? "",
    date: initial?.date ?? todayISO(),
    type: initial?.type ?? JOB_TYPES[0],
    pickup: initial?.pickup ?? "",
    pickupTime: initial?.pickupTime ?? "",
    customer: initial?.customer ?? "",
    phone: initial?.phone ?? "",
    amount: String(initial?.amount ?? ""),
    paid: initial?.paid ?? false,
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // Cars that can take this service: in service and free on the pick-up date.
  function availableCars(date: string) {
    return cars.filter((c) => (c.status === "available" || c.id === initial?.carId) && (!date || !carClash(bookings, jobs, c.id, date, date, initial?.id)));
  }
  const available = availableCars(form.date);

  function changeDate(date: string) {
    const clearCar = !!form.carId && !availableCars(date).some((c) => c.id === form.carId);
    set({ date, carId: clearCar ? "" : form.carId });
    if (clearCar) setErrors((e) => ({ ...e, carId: "That car isn't free on this date. Choose another." }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.driverId) next.driverId = options.length ? "Choose a driver." : "Add a driver first, then record the service.";
    if (!form.date) next.date = "Choose the pick-up date.";
    if (!form.pickup.trim()) next.pickup = "Enter where the driver picks the customer up.";
    if (!form.pickupTime) next.pickupTime = "Enter what time the driver picks the customer up.";
    if (!form.carId) next.carId = available.length ? "Choose a car." : "No cars are free on this date. Change the date to see others.";
    if (!form.customer.trim()) next.customer = "Enter the customer's name.";
    if (!(Number(form.amount) > 0)) next.amount = "Enter an amount above 0 RWF.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await onSave({ id: initial?.id ?? newId(), driverId: form.driverId, carId: form.carId, date: form.date, type: form.type, pickup: form.pickup.trim(), pickupTime: form.pickupTime, customer: form.customer.trim(), phone: form.phone.trim(), amount: Number(form.amount), paid: form.paid, notes: form.notes.trim() || undefined });
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <form className="a-form-stack" onSubmit={submit} noValidate>
      <FormSection title="Customer">
        <Field label="Customer name" required error={errors.customer}>
          {(p) => <input {...p} className="a-input" autoComplete="off" value={form.customer} onChange={(e) => set({ customer: e.target.value })} />}
        </Field>
        <Field label="Phone">
          {(p) => <input {...p} className="a-input" type="tel" autoComplete="off" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
        </Field>
      </FormSection>
      <FormSection title="Pick-up">
        <Field label="Pick-up location" required wide error={errors.pickup} hint="Drop-off can be agreed later.">
          {(p) => (
            <>
              <input {...p} className="a-input" list="jobPlaces" autoComplete="off" value={form.pickup} onChange={(e) => set({ pickup: e.target.value })} />
              <datalist id="jobPlaces">{PICKUP_SUGGESTIONS.map((x) => <option key={x} value={x} />)}</datalist>
            </>
          )}
        </Field>
        <Field label="Pick-up date" required error={errors.date}>
          {(p) => <input {...p} className="a-input" type="date" value={form.date} onChange={(e) => changeDate(e.target.value)} />}
        </Field>
        <Field label="Pick-up time" required error={errors.pickupTime}>
          {(p) => <input {...p} className="a-input" type="time" value={form.pickupTime} onChange={(e) => set({ pickupTime: e.target.value })} />}
        </Field>
      </FormSection>
      <FormSection title="Driver and car">
        <Field label="Type of service">
          {(p) => (
            <select {...p} className="a-input" value={form.type} onChange={(e) => set({ type: e.target.value })}>
              {JOB_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </Field>
        <Field label="Driver" required error={errors.driverId}>
          {(p) => (
            <select {...p} className="a-input" value={form.driverId} onChange={(e) => set({ driverId: e.target.value })}>
              <option value="">Choose a driver</option>
              {options.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </Field>
        <Field label="Car" required wide error={errors.carId} hint="Only cars free on this date are listed.">
          {(p) => (
            <select {...p} className="a-input" value={form.carId} onChange={(e) => { set({ carId: e.target.value }); setErrors((prev) => ({ ...prev, carId: "" })); }}>
              <option value="">{available.length ? `Choose a car (${available.length} free)` : "No cars free on this date"}</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.plate}</option>)}
            </select>
          )}
        </Field>
      </FormSection>
      <FormSection title="Payment">
        <Field label="Amount (RWF)" required error={errors.amount}>
          {(p) => <input {...p} className="a-input" type="number" min="0" step="1000" inputMode="numeric" value={form.amount} onChange={(e) => set({ amount: e.target.value })} />}
        </Field>
        <div className="a-field a-field--center">
          <Check label="Customer has paid" checked={form.paid} onChange={(paid) => set({ paid })} />
        </div>
        <Field label="Notes" wide>
          {(p) => <textarea {...p} className="a-input" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
        </Field>
      </FormSection>
      <FormActions onCancel={onCancel} onDelete={onDelete} submitLabel="Save service" error={formError} />
    </form>
  );
}
