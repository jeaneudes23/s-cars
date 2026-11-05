"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/admin/data";
import { AddButton, Badge, Check, ConfirmDialog, DataTable, Dialog, Field, FormActions, IconButton, PageHeader, useToast } from "@/components/admin/ui";
import { CATEGORY_LABELS } from "@/lib/config";
import { newId, rwf, todayISO } from "@/lib/format";
import { rentalAmount, sum } from "@/lib/metrics";
import type { Car, CarCategory, CarStatus } from "@/lib/types";

const PLACEHOLDER = "/images/hero.jpg";

// Shrinks an uploaded photo so it fits in browser storage.
function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, 800 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => reject(new Error("That file couldn't be read as an image. Try a JPG or PNG."));
    img.src = URL.createObjectURL(file);
  });
}

export default function CarsPage() {
  const { cars, bookings, costs, loading, save, remove } = useData();
  const toast = useToast();
  const [editing, setEditing] = useState<Car | "new" | null>(null);
  const [deleting, setDeleting] = useState<Car | null>(null);
  const today = todayISO();

  const stats = useMemo(() => new Map(cars.map((car) => {
    const own = bookings.filter((b) => b.carId === car.id && b.status !== "cancelled");
    return [car.id, {
      count: own.length,
      revenue: sum(own.filter((b) => b.paid), rentalAmount),
      costs: sum(costs.filter((c) => c.carId === car.id), (c) => c.amount),
      onRent: own.some((b) => b.status === "booked" && b.start <= today && b.end >= today),
    }];
  })), [cars, bookings, costs, today]);

  if (loading) return <p className="a-loading">Loading...</p>;

  const blocked = deleting && (bookings.some((b) => b.carId === deleting.id) || costs.some((c) => c.carId === deleting.id));

  return (
    <>
      <PageHeader title="Cars" subtitle="Cars marked as shown appear on the public website.">
        <AddButton label="Add car" onClick={() => setEditing("new")} />
      </PageHeader>

      <section className="a-card">
        <DataTable
          caption="Cars"
          rows={cars}
          empty={<><p>No cars yet. Add your first car to start taking bookings.</p><AddButton label="Add car" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Car", render: (c) => (
              <div className="a-car-cell">
                <img src={c.image || PLACEHOLDER} alt="" width={72} height={48} loading="lazy" />
                <div><strong>{c.name}</strong><span className="a-sub">{c.plate} · {CATEGORY_LABELS[c.category]}</span></div>
              </div>
            ) },
            { label: "Status", render: (c) => {
              if (c.status === "retired") return <Badge tone="muted">Retired</Badge>;
              if (c.status === "maintenance") return <Badge tone="bad">Maintenance</Badge>;
              return stats.get(c.id)?.onRent ? <Badge tone="warn">On rent</Badge> : <Badge tone="good">Available</Badge>;
            } },
            { label: "Website", render: (c) => c.showOnSite && c.status === "available" ? "Shown" : <span className="a-sub">Hidden</span> },
            { label: "Price per day", align: "right", render: (c) => rwf(c.pricePerDay) },
            { label: "Revenue", align: "right", render: (c) => rwf(stats.get(c.id)?.revenue ?? 0) },
            { label: "Costs", align: "right", render: (c) => rwf(stats.get(c.id)?.costs ?? 0) },
            { label: "Actions", hideLabel: true, align: "right", render: (c) => (
              <div className="a-row-actions">
                <IconButton icon="edit" label={`Edit ${c.name}`} onClick={() => setEditing(c)} />
                <IconButton icon="trash" danger label={`Delete ${c.name}`} onClick={() => setDeleting(c)} />
              </div>
            ) },
          ]}
        />
      </section>

      <Dialog title={editing === "new" ? "Add car" : "Edit car"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <CarForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (car) => { await save("cars", car); setEditing(null); toast("Car saved."); }}
          />
        )}
      </Dialog>

      {deleting && blocked ? (
        <Dialog title="This car can't be deleted" open onClose={() => setDeleting(null)}>
          <p className="a-confirm-text">{deleting.name} has bookings or costs on record, and your reports need them. Set its status to Retired instead: it leaves the website and the booking form, and its history stays.</p>
          <div className="a-form-actions">
            <button type="button" className="btn btn--dark" onClick={() => setDeleting(null)}>OK</button>
          </div>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={!!deleting}
          title="Delete this car?"
          message={deleting && `${deleting.name} will be removed from the admin and the website.`}
          confirmLabel="Delete car"
          onClose={() => setDeleting(null)}
          onConfirm={async () => { await remove("cars", deleting!.id); setDeleting(null); toast("Car deleted."); }}
        />
      )}
    </>
  );
}

function CarForm({ initial, onSave, onCancel }: { initial: Car | null; onSave: (car: Car) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    plate: initial?.plate ?? "",
    category: (initial?.category ?? "economy") as CarCategory,
    cls: initial?.cls ?? "",
    seats: String(initial?.seats ?? 5),
    bags: String(initial?.bags ?? 3),
    gear: initial?.gear ?? "Automatic",
    fuel: initial?.fuel ?? "Petrol",
    pricePerDay: String(initial?.pricePerDay ?? ""),
    status: (initial?.status ?? "available") as CarStatus,
    showOnSite: initial?.showOnSite ?? true,
    tag: initial?.tag ?? "",
    image: initial?.image ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  async function choosePhoto(file?: File) {
    if (!file) return;
    try {
      set({ image: await resizePhoto(file) });
      setErrors((e) => ({ ...e, image: "" }));
    } catch (err) {
      setErrors((e) => ({ ...e, image: (err as Error).message }));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter the car's name, e.g. Toyota RAV4.";
    if (!form.plate.trim()) next.plate = "Enter the number plate.";
    if (!(Number(form.pricePerDay) > 0)) next.pricePerDay = "Enter a daily price above 0 RWF.";
    if (!(Number(form.seats) > 0)) next.seats = "Enter the number of seats.";
    if (!(Number(form.bags) >= 0) || form.bags === "") next.bags = "Enter how many bags fit.";
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await onSave({
        id: initial?.id ?? newId(),
        name: form.name.trim(),
        plate: form.plate.trim().toUpperCase(),
        category: form.category,
        cls: form.cls.trim() || CATEGORY_LABELS[form.category],
        seats: Number(form.seats),
        bags: Number(form.bags),
        gear: form.gear,
        fuel: form.fuel,
        pricePerDay: Number(form.pricePerDay),
        status: form.status,
        showOnSite: form.showOnSite,
        tag: form.tag.trim() || undefined,
        image: form.image || PLACEHOLDER,
      });
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <form className="a-form" onSubmit={submit} noValidate>
      <Field label="Car name" required error={errors.name}>
        {(p) => <input {...p} className="a-input" autoComplete="off" placeholder="Toyota RAV4" value={form.name} onChange={(e) => set({ name: e.target.value })} />}
      </Field>
      <Field label="Number plate" required error={errors.plate}>
        {(p) => <input {...p} className="a-input" autoComplete="off" value={form.plate} onChange={(e) => set({ plate: e.target.value })} />}
      </Field>
      <Field label="Category">
        {(p) => (
          <select {...p} className="a-input" value={form.category} onChange={(e) => set({ category: e.target.value as CarCategory })}>
            {(Object.keys(CATEGORY_LABELS) as CarCategory[]).map((k) => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
          </select>
        )}
      </Field>
      <Field label="Description" hint="Shown under the name on the website.">
        {(p) => <input {...p} className="a-input" placeholder="Compact SUV" value={form.cls} onChange={(e) => set({ cls: e.target.value })} />}
      </Field>
      <Field label="Seats" required error={errors.seats}>
        {(p) => <input {...p} className="a-input" type="number" min="1" inputMode="numeric" value={form.seats} onChange={(e) => set({ seats: e.target.value })} />}
      </Field>
      <Field label="Bags" required error={errors.bags}>
        {(p) => <input {...p} className="a-input" type="number" min="0" inputMode="numeric" value={form.bags} onChange={(e) => set({ bags: e.target.value })} />}
      </Field>
      <Field label="Gearbox">
        {(p) => (
          <select {...p} className="a-input" value={form.gear} onChange={(e) => set({ gear: e.target.value as Car["gear"] })}>
            <option>Automatic</option><option>Manual</option>
          </select>
        )}
      </Field>
      <Field label="Fuel">
        {(p) => (
          <select {...p} className="a-input" value={form.fuel} onChange={(e) => set({ fuel: e.target.value as Car["fuel"] })}>
            <option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option>
          </select>
        )}
      </Field>
      <Field label="Price per day (RWF)" required error={errors.pricePerDay}>
        {(p) => <input {...p} className="a-input" type="number" min="0" step="1000" inputMode="numeric" value={form.pricePerDay} onChange={(e) => set({ pricePerDay: e.target.value })} />}
      </Field>
      <Field label="Status">
        {(p) => (
          <select {...p} className="a-input" value={form.status} onChange={(e) => set({ status: e.target.value as CarStatus })}>
            <option value="available">Available</option>
            <option value="maintenance">In maintenance</option>
            <option value="retired">Retired</option>
          </select>
        )}
      </Field>
      <Field label="Label" hint="Optional badge, e.g. Popular.">
        {(p) => <input {...p} className="a-input" value={form.tag} onChange={(e) => set({ tag: e.target.value })} />}
      </Field>
      <Field label="Photo" error={errors.image} hint="JPG or PNG. Resized automatically.">
        {(p) => <input {...p} className="a-input a-file" type="file" accept="image/*" onChange={(e) => choosePhoto(e.target.files?.[0])} />}
      </Field>
      {form.image && (
        <div className="a-field--wide a-photo-preview">
          <img src={form.image} alt="Selected car" width={120} height={80} />
        </div>
      )}
      <div className="a-field--wide">
        <Check label="Show on the website when available" checked={form.showOnSite} onChange={(showOnSite) => set({ showOnSite })} />
      </div>
      <div className="a-field--wide"><FormActions onCancel={onCancel} submitLabel="Save car" error={formError} /></div>
    </form>
  );
}
