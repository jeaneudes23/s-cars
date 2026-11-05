"use client";

import { useMemo, useState } from "react";
import { useData } from "@/components/admin/data";
import { AddButton, Badge, Check, ConfirmDialog, DataTable, Dialog, Field, FormActions, IconButton, PageHeader, Segmented, useToast, type Tone } from "@/components/admin/ui";
import { PICKUP_SUGGESTIONS } from "@/lib/config";
import { addDays, daysBetween, formatDate, newId, num, rwf, todayISO } from "@/lib/format";
import { bookingState, bookingTotal, findOverlap, type BookingState } from "@/lib/metrics";
import type { Booking, BookingStatus } from "@/lib/types";

const STATE_TONE: Record<BookingState, Tone> = { Upcoming: "info", "On rent": "warn", Completed: "good", Cancelled: "muted" };
type Filter = "all" | BookingState;
const FILTERS: Filter[] = ["all", "Upcoming", "On rent", "Completed", "Cancelled"];

export default function BookingsPage() {
  const { bookings, cars, drivers, loading, save, remove } = useData();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Booking | "new" | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const today = todayISO();
  const carName = (id: string) => cars.find((c) => c.id === id)?.name ?? "Removed car";

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => filter === "all" || bookingState(b, today) === filter)
      .filter((b) => !q || b.customer.toLowerCase().includes(q) || carName(b.carId).toLowerCase().includes(q) || b.phone.includes(q))
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [bookings, cars, filter, search, today]);

  if (loading) return <p className="a-loading">Loading...</p>;

  return (
    <>
      <PageHeader title="Bookings" subtitle="Record each booking after confirming it on WhatsApp.">
        <AddButton label="Add booking" onClick={() => setEditing("new")} />
      </PageHeader>

      <div className="a-toolbar">
        <Segmented label="Filter by status" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ key: f, label: f === "all" ? "All" : f }))} />
        <div className="a-search">
          <label htmlFor="bookingSearch" className="sr-only">Search bookings</label>
          <input id="bookingSearch" className="a-input" type="search" placeholder="Search customer, car or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <section className="a-card">
        <DataTable
          caption="Bookings"
          rows={rows}
          empty={<><p>No bookings match.</p><AddButton label="Add booking" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Customer", render: (b) => <><strong>{b.customer}</strong><span className="a-sub">{b.phone}</span></> },
            { label: "Car", render: (b) => <>{carName(b.carId)}{b.driverId && <span className="a-sub">With {drivers.find((d) => d.id === b.driverId)?.name ?? "driver"}{b.pickup ? `, from ${b.pickup}` : ""}{b.pickupTime ? ` at ${b.pickupTime}` : ""}</span>}</> },
            { label: "Dates", render: (b) => <>{formatDate(b.start)}<span className="a-sub">to {formatDate(b.end)} ({daysBetween(b.start, b.end)} days)</span></> },
            { label: "Status", render: (b) => { const s = bookingState(b, today); return <Badge tone={STATE_TONE[s]}>{s}</Badge>; } },
            { label: "Payment", render: (b) => b.status === "cancelled" ? <span className="a-sub">None</span> : <Badge tone={b.paid ? "good" : "bad"}>{b.paid ? "Paid" : "Unpaid"}</Badge> },
            { label: "Total", align: "right", render: (b) => rwf(bookingTotal(b)) },
            { label: "Actions", hideLabel: true, align: "right", render: (b) => (
              <div className="a-row-actions">
                <IconButton icon="edit" label={`Edit booking for ${b.customer}`} onClick={() => setEditing(b)} />
                <IconButton icon="trash" danger label={`Delete booking for ${b.customer}`} onClick={() => setDeleting(b)} />
              </div>
            ) },
          ]}
        />
      </section>

      <Dialog title={editing === "new" ? "Add booking" : "Edit booking"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <BookingForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (b) => { await save("bookings", b); setEditing(null); toast("Booking saved."); }}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        title="Delete this booking?"
        message={deleting && `The booking for ${deleting.customer} will be removed and its revenue taken out of your reports. To keep the record, edit it and set the status to Cancelled instead.`}
        confirmLabel="Delete booking"
        onClose={() => setDeleting(null)}
        onConfirm={async () => { await remove("bookings", deleting!.id); setDeleting(null); toast("Booking deleted."); }}
      />
    </>
  );
}

function BookingForm({ initial, onSave, onCancel }: { initial: Booking | null; onSave: (b: Booking) => Promise<void>; onCancel: () => void }) {
  const { cars, drivers, bookings } = useData();
  const today = todayISO();
  const selectable = cars.filter((c) => c.status !== "retired" || c.id === initial?.carId);
  const firstCar = selectable[0];

  const [form, setForm] = useState({
    customer: initial?.customer ?? "",
    phone: initial?.phone ?? "",
    carId: initial?.carId ?? firstCar?.id ?? "",
    start: initial?.start ?? today,
    end: initial?.end ?? addDays(today, 3),
    pickup: initial?.pickup ?? "",
    pickupTime: initial?.pickupTime ?? "",
    dailyRate: String(initial?.dailyRate ?? firstCar?.pricePerDay ?? ""),
    driverId: initial?.driverId ?? "",
    driverFee: String(initial?.driverFee ?? 0),
    status: (initial?.status ?? "booked") as BookingStatus,
    paid: initial?.paid ?? false,
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const days = form.start && form.end && form.end >= form.start ? daysBetween(form.start, form.end) : 0;
  const total = days * (Number(form.dailyRate) || 0) + (form.driverId ? Number(form.driverFee) || 0 : 0);

  // Picking a car or driver, or changing dates, fills in their standard prices.
  function feeFor(driverId: string, start: string, end: string) {
    const rate = drivers.find((d) => d.id === driverId)?.dayRate ?? 0;
    return String(end >= start ? rate * daysBetween(start, end) : 0);
  }

  function changeDates(patch: { start?: string; end?: string }) {
    const next = { ...form, ...patch };
    set({ ...patch, driverFee: next.driverId ? feeFor(next.driverId, next.start, next.end) : form.driverFee });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.customer.trim()) next.customer = "Enter the customer's name.";
    if (!form.carId) next.carId = "Add a car first, then record the booking.";
    if (!form.start) next.start = "Choose a start date.";
    if (!form.end) next.end = "Choose a return date.";
    else if (form.end < form.start) next.end = "Return can't be before the start date.";
    if (!(Number(form.dailyRate) >= 0) || form.dailyRate === "") next.dailyRate = "Enter the daily price in RWF.";
    if (form.driverId && !form.pickup.trim()) next.pickup = "Enter where the driver picks the customer up.";
    if (form.driverId && !form.pickupTime) next.pickupTime = "Enter what time the driver picks the customer up.";
    if (form.driverId && !(Number(form.driverFee) >= 0)) next.driverFee = "Enter the driver fee in RWF.";

    if (!next.carId && !next.end && form.status !== "cancelled") {
      const clash = findOverlap(bookings, form.carId, form.start, form.end, initial?.id);
      if (clash) next.carId = `This car is already booked by ${clash.customer} from ${formatDate(clash.start)} to ${formatDate(clash.end)}. Pick another car or change the dates.`;
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    try {
      await onSave({
        id: initial?.id ?? newId(),
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        carId: form.carId,
        start: form.start,
        end: form.end,
        pickup: form.driverId ? form.pickup.trim() : undefined,
        pickupTime: form.driverId ? form.pickupTime : undefined,
        dailyRate: Number(form.dailyRate),
        driverId: form.driverId || undefined,
        driverFee: form.driverId ? Number(form.driverFee) : 0,
        status: form.status,
        paid: form.paid,
        notes: form.notes.trim() || undefined,
      });
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  return (
    <form className="a-form" onSubmit={submit} noValidate>
      <Field label="Customer name" required error={errors.customer}>
        {(p) => <input {...p} className="a-input" autoComplete="off" value={form.customer} onChange={(e) => set({ customer: e.target.value })} />}
      </Field>
      <Field label="Phone">
        {(p) => <input {...p} className="a-input" type="tel" autoComplete="off" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />}
      </Field>
      <Field label="Car" required wide error={errors.carId}>
        {(p) => (
          <select {...p} className="a-input" value={form.carId} onChange={(e) => {
            const car = cars.find((c) => c.id === e.target.value);
            set({ carId: e.target.value, dailyRate: String(car?.pricePerDay ?? form.dailyRate) });
          }}>
            {selectable.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.plate}{c.status === "maintenance" ? " (in maintenance)" : ""}</option>)}
          </select>
        )}
      </Field>
      <Field label={form.driverId ? "Pick-up date" : "Start date"} required error={errors.start}>
        {(p) => <input {...p} className="a-input" type="date" value={form.start} onChange={(e) => changeDates({ start: e.target.value })} />}
      </Field>
      <Field label={form.driverId ? "Last day" : "Return date"} required error={errors.end} hint={form.driverId ? "Not known yet? Leave it as the pick-up date and update it later." : undefined}>
        {(p) => <input {...p} className="a-input" type="date" min={form.start} value={form.end} onChange={(e) => changeDates({ end: e.target.value })} />}
      </Field>
      <Field label="Price per day (RWF)" required error={errors.dailyRate}>
        {(p) => <input {...p} className="a-input" type="number" min="0" step="1000" inputMode="numeric" value={form.dailyRate} onChange={(e) => set({ dailyRate: e.target.value })} />}
      </Field>
      <Field label="Driver" hint="Leave empty for self-drive.">
        {(p) => (
          <select {...p} className="a-input" value={form.driverId} onChange={(e) => {
            const driverId = e.target.value;
            const end = driverId && !initial ? form.start : form.end;
            set({ driverId, end, driverFee: driverId ? feeFor(driverId, form.start, end) : "0" });
          }}>
            <option value="">No driver</option>
            {drivers.filter((d) => d.active || d.id === initial?.driverId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Driver fee (RWF)" error={errors.driverFee} hint={form.driverId ? "Total for the whole booking." : undefined}>
        {(p) => <input {...p} className="a-input" type="number" min="0" step="1000" inputMode="numeric" disabled={!form.driverId} value={form.driverId ? form.driverFee : ""} onChange={(e) => set({ driverFee: e.target.value })} />}
      </Field>
      {form.driverId && (
        <>
          <Field label="Pick-up location" required error={errors.pickup} hint="Drop-off can be agreed later.">
            {(p) => (
              <>
                <input {...p} className="a-input" list="bookingPlaces" autoComplete="off" value={form.pickup} onChange={(e) => set({ pickup: e.target.value })} />
                <datalist id="bookingPlaces">{PICKUP_SUGGESTIONS.map((x) => <option key={x} value={x} />)}</datalist>
              </>
            )}
          </Field>
          <Field label="Pick-up time" required error={errors.pickupTime}>
            {(p) => <input {...p} className="a-input" type="time" value={form.pickupTime} onChange={(e) => set({ pickupTime: e.target.value })} />}
          </Field>
        </>
      )}
      <Field label="Status">
        {(p) => (
          <select {...p} className="a-input" value={form.status} onChange={(e) => set({ status: e.target.value as BookingStatus })}>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        )}
      </Field>
      <div className="a-field a-field--center">
        <Check label="Customer has paid" checked={form.paid} onChange={(paid) => set({ paid })} />
      </div>
      <Field label="Notes" wide>
        {(p) => <textarea {...p} className="a-input" rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />}
      </Field>
      <p className="a-total a-field--wide">
        <span>{days ? `${days} ${days === 1 ? "day" : "days"} × ${num(Number(form.dailyRate) || 0)}${form.driverId ? " + driver" : ""}` : "Total"}</span>
        <strong>{rwf(total)}</strong>
      </p>
      <div className="a-field--wide"><FormActions onCancel={onCancel} submitLabel="Save booking" error={formError} /></div>
    </form>
  );
}
