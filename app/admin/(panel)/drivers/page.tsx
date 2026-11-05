"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/admin/data";
import { AddButton, Badge, Check, ConfirmDialog, DataTable, Dialog, Field, FormActions, IconButton, PageHeader, useToast } from "@/components/admin/ui";
import { newId, rwf } from "@/lib/format";
import { sum } from "@/lib/metrics";
import type { Driver } from "@/lib/types";

export default function DriversPage() {
  const { drivers, bookings, jobs, loading, save, remove } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [deleting, setDeleting] = useState<Driver | null>(null);

  const stats = useMemo(() => new Map(drivers.map((d) => {
    const ownBookings = bookings.filter((b) => b.driverId === d.id && b.status !== "cancelled");
    const ownJobs = jobs.filter((j) => j.driverId === d.id);
    return [d.id, {
      count: ownBookings.length + ownJobs.length,
      earned: sum(ownBookings.filter((b) => b.paid), (b) => b.driverFee) + sum(ownJobs.filter((j) => j.paid), (j) => j.amount),
    }];
  })), [drivers, bookings, jobs]);

  if (loading) return <p className="a-loading">Loading...</p>;

  const blocked = deleting && (bookings.some((b) => b.driverId === deleting.id) || jobs.some((j) => j.driverId === deleting.id));

  return (
    <>
      <PageHeader title="Drivers" subtitle="Revenue includes drivers on bookings and standalone driver jobs.">
        <AddButton label="Add driver" onClick={() => setEditing("new")} />
      </PageHeader>

      <section className="a-card">
        <DataTable
          caption="Drivers"
          rows={drivers}
          empty={<><p>No drivers yet.</p><AddButton label="Add driver" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Driver", render: (d) => <><strong>{d.name}</strong><span className="a-sub">Licence {d.licence || "not recorded"}</span></> },
            { label: "Phone", render: (d) => d.phone ? <a className="a-link" href={`tel:${d.phone.replace(/\s/g, "")}`}>{d.phone}</a> : <span className="a-sub">None</span> },
            { label: "Status", render: (d) => <Badge tone={d.active ? "good" : "muted"}>{d.active ? "Active" : "Inactive"}</Badge> },
            { label: "Day rate", align: "right", render: (d) => rwf(d.dayRate) },
            { label: "Services", align: "right", render: (d) => stats.get(d.id)?.count ?? 0 },
            { label: "Revenue", align: "right", render: (d) => rwf(stats.get(d.id)?.earned ?? 0) },
            { label: "Actions", hideLabel: true, align: "right", render: (d) => (
              <div className="a-row-actions">
                <IconButton icon="edit" label={`Edit ${d.name}`} onClick={() => setEditing(d)} />
                <IconButton icon="trash" danger label={`Delete ${d.name}`} onClick={() => setDeleting(d)} />
              </div>
            ) },
          ]}
        />
      </section>

      <Dialog title={editing === "new" ? "Add driver" : "Edit driver"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <DriverForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (d) => { await save("drivers", d); setEditing(null); toast("Driver saved."); }}
          />
        )}
      </Dialog>

      {deleting && blocked ? (
        <Dialog title="This driver can't be deleted" open onClose={() => setDeleting(null)}>
          <p className="a-confirm-text">{deleting.name} has services on record, and your reports need them. Untick Active instead: they leave the booking form and their history stays.</p>
          <div className="a-form-actions">
            <button type="button" className="btn btn--dark" onClick={() => setDeleting(null)}>OK</button>
          </div>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={!!deleting}
          title="Delete this driver?"
          message={deleting && `${deleting.name} will be removed from your driver list.`}
          confirmLabel="Delete driver"
          onClose={() => setDeleting(null)}
          onConfirm={async () => { await remove("drivers", deleting!.id); setDeleting(null); toast("Driver deleted."); }}
        />
      )}
    </>
  );
}

function DriverForm({ initial, onSave, onCancel }: { initial: Driver | null; onSave: (d: Driver) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    phone: initial?.phone ?? "",
    licence: initial?.licence ?? "",
    dayRate: String(initial?.dayRate ?? 25000),
    active: initial?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter the driver's name.";
    if (!(Number(form.dayRate) >= 0) || form.dayRate === "") next.dayRate = "Enter the day rate in RWF.";
    setErrors(next);
    if (Object.keys(next).length) return;
    try {
      await onSave({ id: initial?.id ?? newId(), name: form.name.trim(), phone: form.phone.trim(), licence: form.licence.trim(), dayRate: Number(form.dayRate), active: form.active });
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <form className="a-form" onSubmit={submit} noValidate>
      <Field label="Name" required error={errors.name}>
        {(p) => <input {...p} className="a-input" autoComplete="off" value={form.name} onChange={(e) => set({ name: e.target.value })} />}
      </Field>
      <Field label="Phone">
        {(p) => <input {...p} className="a-input" type="tel" autoComplete="off" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
      </Field>
      <Field label="Licence number">
        {(p) => <input {...p} className="a-input" autoComplete="off" value={form.licence} onChange={(e) => set({ licence: e.target.value })} />}
      </Field>
      <Field label="Day rate (RWF)" required error={errors.dayRate} hint="Fills in the driver fee on bookings.">
        {(p) => <input {...p} className="a-input" type="number" min="0" step="1000" inputMode="numeric" value={form.dayRate} onChange={(e) => set({ dayRate: e.target.value })} />}
      </Field>
      <div className="a-field--wide">
        <Check label="Active (can be assigned to new work)" checked={form.active} onChange={(active) => set({ active })} />
      </div>
      <div className="a-field--wide"><FormActions onCancel={onCancel} submitLabel="Save driver" error={formError} /></div>
    </form>
  );
}
