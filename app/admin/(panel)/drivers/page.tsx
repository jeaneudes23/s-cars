"use client";

import { useState } from "react";
import { useData, useQuickSave } from "@/components/admin/data";
import { AddButton, Badge, Check, ConfirmDialog, DataTable, Dialog, Field, FormActions, IconButton, PageHeader, StatusMenu, ViewDialog, useToast } from "@/components/admin/ui";
import { newId, rwf } from "@/lib/format";
import type { Driver } from "@/lib/types";

export default function DriversPage() {
  const { drivers, jobs, loading, save, remove } = useData();
  const toast = useToast();
  const quickSave = useQuickSave();
  const [editing, setEditing] = useState<Driver | "new" | null>(null);
  const [deleting, setDeleting] = useState<Driver | null>(null);
  const [viewing, setViewing] = useState<Driver | null>(null);

  if (loading) return <p className="a-loading">Loading...</p>;

  const blocked = deleting && jobs.some((j) => j.driverId === deleting.id);

  return (
    <>
      <PageHeader title="Drivers" subtitle="The people you can assign to driver services.">
        <AddButton label="Add driver" onClick={() => setEditing("new")} />
      </PageHeader>

      <section className="a-card">
        <DataTable
          caption="Drivers"
          rows={drivers}
          empty={<><p>No drivers yet.</p><AddButton label="Add driver" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Driver and contact", render: (d) => (
              <>
                <strong>{d.name}</strong>
                {d.phone && <a className="a-link a-line" href={`tel:${d.phone.replace(/\s/g, "")}`}>{d.phone}</a>}
                <span className="a-sub">Licence {d.licence || "not recorded"}</span>
              </>
            ) },
            { label: "Status", render: (d) => <StatusMenu label={`Status of ${d.name}`} text={d.active ? "Active" : "Inactive"} tone={d.active ? "good" : "muted"} value={d.active ? "active" : "inactive"} options={[{ key: "active", label: "Active" }, { key: "inactive", label: "Inactive" }]} onChange={(v) => quickSave("drivers", { ...d, active: v === "active" }, `${d.name}: ${v === "active" ? "Active" : "Inactive"}`)} /> },
            { label: "Day rate", align: "right", sort: (d) => d.dayRate, render: (d) => rwf(d.dayRate) },
            { label: "Actions", hideLabel: true, align: "right", render: (d) => (
              <div className="a-row-actions">
                <IconButton icon="eye" label={`View ${d.name}`} onClick={() => setViewing(d)} />
                <IconButton icon="edit" label={`Edit ${d.name}`} onClick={() => setEditing(d)} />
              </div>
            ) },
          ]}
        />
      </section>

      <ViewDialog
        title="Driver details"
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setViewing(null); }}
        sections={viewing ? [
          { title: "Driver", items: [["Name", viewing.name], ["Phone", viewing.phone], ["Licence", viewing.licence], ["Status", viewing.active ? "Active" : "Inactive"], ["Day rate", rwf(viewing.dayRate)]] },
        ] : []}
      />

      <Dialog title={editing === "new" ? "Add driver" : "Edit driver"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <DriverForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onDelete={editing === "new" ? undefined : () => { setDeleting(editing); setEditing(null); }}
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

function DriverForm({ initial, onSave, onCancel, onDelete }: { initial: Driver | null; onSave: (d: Driver) => Promise<void>; onCancel: () => void; onDelete?: () => void }) {
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
      <div className="a-field--wide"><FormActions onCancel={onCancel} onDelete={onDelete} submitLabel="Save driver" error={formError} /></div>
    </form>
  );
}
