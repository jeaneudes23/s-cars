"use client";

import { useMemo, useState } from "react";
import { useData, useQuickSave } from "@/components/admin/data";
import { AddButton, Badge, Check, ConfirmDialog, DataTable, Dialog, Field, FormActions, FormSection, IconButton, PAYMENT_OPTIONS, PageHeader, SearchBox, Segmented, StatusMenu, ViewDialog, useToast, type Tone } from "@/components/admin/ui";
import { addDays, daysBetween, formatDate, matchesSearch, newId, num, rwf, todayISO } from "@/lib/format";
import { bookingState, bookingTotal, carClash, type BookingState } from "@/lib/metrics";
import type { Booking, BookingStatus } from "@/lib/types";

const STATE_TONE: Record<BookingState, Tone> = { Upcoming: "info", "On rent": "warn", Completed: "good", Cancelled: "muted" };
type Filter = "all" | BookingState;
const STATUS_OPTIONS: { key: BookingStatus; label: string }[] = [{ key: "booked", label: "Booked" }, { key: "completed", label: "Completed" }, { key: "cancelled", label: "Cancelled" }];
const FILTERS: Filter[] = ["all", "Upcoming", "On rent", "Completed", "Cancelled"];

export default function BookingsPage() {
  const { bookings, cars, jobs, loading, save, remove } = useData();
  const toast = useToast();
  const quickSave = useQuickSave();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Booking | "new" | null>(null);
  const [deleting, setDeleting] = useState<Booking | null>(null);
  const [viewing, setViewing] = useState<Booking | null>(null);
  const today = todayISO();
  const carName = (id: string) => cars.find((c) => c.id === id)?.name ?? "Removed car";

  const rows = useMemo(() => {
    return bookings
      .filter((b) => filter === "all" || bookingState(b, today) === filter)
      .filter((b) => matchesSearch(search, [b.customer, b.phone, carName(b.carId), cars.find((c) => c.id === b.carId)?.plate, formatDate(b.start), b.notes]))
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [bookings, cars, filter, search, today]);

  function changeStatus(b: Booking, status: BookingStatus) {
    // Reviving a cancelled booking needs its car to still be free.
    const clash = b.status === "cancelled" && carClash(bookings, jobs, b.carId, b.start, b.end, b.id);
    if (clash) {
      toast(`${carName(b.carId)} is now taken by ${clash.customer}. Edit the booking to choose another car.`);
      return;
    }
    quickSave("bookings", { ...b, status }, `${b.customer}: ${STATUS_OPTIONS.find((o) => o.key === status)?.label}`);
  }

  if (loading) return <p className="a-loading">Loading...</p>;

  return (
    <>
      <PageHeader title="Bookings" subtitle="Self-drive rentals. Record each one after confirming it on WhatsApp.">
        <AddButton label="Add booking" onClick={() => setEditing("new")} />
      </PageHeader>

      <div className="a-toolbar">
        <Segmented label="Filter by status" value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ key: f, label: f === "all" ? "All" : f }))} />
        <SearchBox label="Search bookings" placeholder="Search customer, car, plate or phone" value={search} onChange={setSearch} count={rows.length} />
      </div>

      <section className="a-card">
        <DataTable
          caption="Bookings"
          rows={rows}
          empty={<><p>{search.trim() ? `No bookings match "${search.trim()}".` : "No bookings match."}</p><AddButton label="Add booking" onClick={() => setEditing("new")} /></>}
          columns={[
            { label: "Customer and car", render: (b) => (
              <>
                <strong>{b.customer}</strong>
                <span className="a-line">{carName(b.carId)}</span>
                {b.phone && <span className="a-sub">{b.phone}</span>}
              </>
            ) },
            { label: "Dates", sort: (b) => b.start, render: (b) => {
              const days = daysBetween(b.start, b.end);
              return <span className="a-nowrap">{formatDate(b.start)}<span className="a-sub">to {formatDate(b.end)}, {days} {days === 1 ? "day" : "days"}</span></span>;
            } },
            { label: "Status", render: (b) => {
              const s = bookingState(b, today);
              return <StatusMenu label={`Status of booking for ${b.customer}`} text={s} tone={STATE_TONE[s]} value={b.status} options={STATUS_OPTIONS} onChange={(status) => changeStatus(b, status)} />;
            } },
            { label: "Total and payment", align: "right", sort: bookingTotal, render: (b) => (
              <div className="a-amount">
                {rwf(bookingTotal(b))}
                {b.status !== "cancelled" && <StatusMenu label={`Payment for ${b.customer}`} text={b.paid ? "Paid" : "Unpaid"} tone={b.paid ? "good" : "bad"} value={b.paid ? "paid" : "unpaid"} options={PAYMENT_OPTIONS} onChange={(v) => quickSave("bookings", { ...b, paid: v === "paid" }, `${b.customer}: ${v === "paid" ? "Paid" : "Unpaid"}`)} />}
              </div>
            ) },
            { label: "Actions", hideLabel: true, align: "right", render: (b) => (
              <div className="a-row-actions">
                <IconButton icon="eye" label={`View booking for ${b.customer}`} onClick={() => setViewing(b)} />
                <IconButton icon="edit" label={`Edit booking for ${b.customer}`} onClick={() => setEditing(b)} />
              </div>
            ) },
          ]}
        />
      </section>

      <ViewDialog
        title="Booking details"
        open={!!viewing}
        onClose={() => setViewing(null)}
        onEdit={() => { setEditing(viewing); setViewing(null); }}
        sections={viewing ? [
          { title: "Customer", items: [["Name", viewing.customer], ["Phone", viewing.phone]] },
          { title: "Rental", items: [["Car", carName(viewing.carId)], ["Number plate", cars.find((c) => c.id === viewing.carId)?.plate], ["Start date", formatDate(viewing.start)], ["Return date", formatDate(viewing.end)], ["Days", daysBetween(viewing.start, viewing.end)], ["Price per day", rwf(viewing.dailyRate)]] },
          { title: "Status and payment", items: [["Status", bookingState(viewing, today)], ["Payment", viewing.status === "cancelled" ? "None due" : viewing.paid ? "Paid" : "Unpaid"], ["Total", rwf(bookingTotal(viewing))], ["Notes", viewing.notes]] },
        ] : []}
      />

      <Dialog title={editing === "new" ? "Add booking" : "Edit booking"} open={!!editing} onClose={() => setEditing(null)}>
        {editing && (
          <BookingForm
            initial={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onDelete={editing === "new" ? undefined : () => { setDeleting(editing); setEditing(null); }}
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

function BookingForm({ initial, onSave, onCancel, onDelete }: { initial: Booking | null; onSave: (b: Booking) => Promise<void>; onCancel: () => void; onDelete?: () => void }) {
  const { cars, jobs, bookings } = useData();
  const today = todayISO();

  const [form, setForm] = useState({
    customer: initial?.customer ?? "",
    phone: initial?.phone ?? "",
    carId: initial?.carId ?? "",
    start: initial?.start ?? today,
    end: initial?.end ?? addDays(today, 3),
    dailyRate: String(initial?.dailyRate ?? ""),
    status: (initial?.status ?? "booked") as BookingStatus,
    paid: initial?.paid ?? false,
    notes: initial?.notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const days = form.start && form.end && form.end >= form.start ? daysBetween(form.start, form.end) : 0;
  const total = days * (Number(form.dailyRate) || 0);

  // Cars that can take this booking: in service and free on the chosen dates.
  function availableCars(start: string, end: string) {
    return cars.filter((c) => {
      if (c.status !== "available" && c.id !== initial?.carId) return false;
      if (form.status === "cancelled" || !start || !end || end < start) return true;
      return !carClash(bookings, jobs, c.id, start, end, initial?.id);
    });
  }
  const available = availableCars(form.start, form.end);

  function changeDates(patch: { start?: string; end?: string }) {
    const next = { ...form, ...patch };
    const clearCar = !!form.carId && !availableCars(next.start, next.end).some((c) => c.id === form.carId);
    set({ ...patch, carId: clearCar ? "" : form.carId, dailyRate: clearCar ? "" : form.dailyRate });
    if (clearCar) setErrors((e) => ({ ...e, carId: "That car isn't free on these dates. Choose another." }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!form.customer.trim()) next.customer = "Enter the customer's name.";
    if (!form.start) next.start = "Choose a start date.";
    if (!form.end) next.end = "Choose a return date.";
    else if (form.end < form.start) next.end = "Return can't be before the start date.";
    if (!form.carId) next.carId = available.length ? "Choose a car." : "No cars are free on these dates. Change the dates to see others.";
    if (!(Number(form.dailyRate) >= 0) || form.dailyRate === "") next.dailyRate = "Enter the daily price in RWF.";

    // Still checked on save, in case the status was changed back from cancelled.
    if (!next.carId && !next.end && form.status !== "cancelled") {
      const clash = carClash(bookings, jobs, form.carId, form.start, form.end, initial?.id);
      if (clash) next.carId = `This car is already taken by ${clash.customer} from ${formatDate(clash.start)} to ${formatDate(clash.end)}. Pick another car or change the dates.`;
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
        dailyRate: Number(form.dailyRate),
        status: form.status,
        paid: form.paid,
        notes: form.notes.trim() || undefined,
      });
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
      <FormSection title="Dates">
        <Field label="Start date" required error={errors.start}>
          {(p) => <input {...p} className="a-input" type="date" value={form.start} onChange={(e) => changeDates({ start: e.target.value })} />}
        </Field>
        <Field label="Return date" required error={errors.end}>
          {(p) => <input {...p} className="a-input" type="date" min={form.start} value={form.end} onChange={(e) => changeDates({ end: e.target.value })} />}
        </Field>
      </FormSection>
      <FormSection title="Car">
        <Field label="Car" required error={errors.carId} hint="Only cars free on these dates are listed.">
          {(p) => (
            <select {...p} className="a-input" value={form.carId} onChange={(e) => {
              const car = cars.find((c) => c.id === e.target.value);
              set({ carId: e.target.value, dailyRate: car ? String(car.pricePerDay) : "" });
              setErrors((prev) => ({ ...prev, carId: "" }));
            }}>
              <option value="">{available.length ? `Choose a car (${available.length} free)` : "No cars free on these dates"}</option>
              {available.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.plate}</option>)}
            </select>
          )}
        </Field>
        <Field label="Price per day (RWF)" required error={errors.dailyRate}>
          {(p) => <input {...p} className="a-input" type="number" min="0" step="1000" inputMode="numeric" value={form.dailyRate} onChange={(e) => set({ dailyRate: e.target.value })} />}
        </Field>
      </FormSection>
      <FormSection title="Status and payment">
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
          <span>{days ? `${days} ${days === 1 ? "day" : "days"} × ${num(Number(form.dailyRate) || 0)}` : "Total"}</span>
          <strong>{rwf(total)}</strong>
        </p>
      </FormSection>
      <FormActions onCancel={onCancel} onDelete={onDelete} submitLabel="Save booking" error={formError} />
    </form>
  );
}
