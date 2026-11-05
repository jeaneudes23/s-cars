"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/Icon";
import { PICKUP_SUGGESTIONS } from "@/lib/config";
import { num, todayISO } from "@/lib/format";
import { bookingLink, useBooking, type BookingForm, type RentalMode } from "./booking";

const MODES: { key: RentalMode; label: string }[] = [
  { key: "self-drive", label: "Self-drive" },
  { key: "driver", label: "With driver" },
];

// Self-drive asks for a car and two dates. With a driver it asks where and when to
// pick the customer up; how long and the drop-off are settled later.
export function BookingFields({ stacked, onDone }: { stacked?: boolean; onDone?: () => void }) {
  const { form, update, cars, days } = useBooking();
  const [error, setError] = useState("");
  const id = useId();
  const withDriver = form.mode === "driver";
  const car = cars.find((c) => c.id === form.carId);

  function validate() {
    if (withDriver && !form.pickup.trim()) return "Tell us where the driver should pick you up.";
    if (!form.start) return withDriver ? "Choose your pick-up date." : "Choose your start date.";
    if (form.start < todayISO()) return `The ${withDriver ? "pick-up" : "start"} date has passed. Pick today or a later date.`;
    if (withDriver) return form.time ? "" : "Choose what time the driver should pick you up.";
    if (!form.end) return "Choose your return date.";
    if (form.end < form.start) return "The return date can't be before the start date.";
    return "";
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const message = validate();
    setError(message);
    if (message) return;
    window.open(bookingLink(form, cars), "_blank", "noopener");
    onDone?.();
  }

  const change = (patch: Partial<BookingForm>) => { update(patch); setError(""); };
  const today = todayISO();

  return (
    <form className={`search ${stacked ? "search--stacked" : ""}`} data-mode={form.mode} onSubmit={submit} noValidate>
      <div className="search__tabs" role="radiogroup" aria-label="Rental type">
        {MODES.map((m) => (
          <label className="tab" key={m.key}>
            <input type="radio" name={`${id}-mode`} checked={form.mode === m.key} onChange={() => change({ mode: m.key })} />
            <span>{m.label}</span>
          </label>
        ))}
      </div>
      <div className="search__fields">
        {withDriver && (
          <div className="field">
            <label htmlFor={`${id}-pickup`}>Pick-up location</label>
            <input id={`${id}-pickup`} list={`${id}-places`} placeholder="Hotel, address or airport" autoComplete="off" value={form.pickup} onChange={(e) => change({ pickup: e.target.value })} />
            <datalist id={`${id}-places`}>
              {PICKUP_SUGGESTIONS.map((p) => <option key={p} value={p} />)}
            </datalist>
          </div>
        )}
        <div className="field">
          <label htmlFor={`${id}-car`}>Car</label>
          <select id={`${id}-car`} value={form.carId} onChange={(e) => change({ carId: e.target.value })}>
            <option value="">Help me choose</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${id}-start`}>{withDriver ? "Pick-up date" : "Start date"}</label>
          <input type="date" id={`${id}-start`} value={form.start} min={today} aria-describedby={`${id}-error`} onChange={(e) => change({ start: e.target.value })} />
        </div>
        {withDriver ? (
          <div className="field">
            <label htmlFor={`${id}-time`}>Pick-up time</label>
            <input type="time" id={`${id}-time`} value={form.time} aria-describedby={`${id}-error`} onChange={(e) => change({ time: e.target.value })} />
          </div>
        ) : (
          <div className="field">
            <label htmlFor={`${id}-end`}>Return date</label>
            <input type="date" id={`${id}-end`} value={form.end} min={form.start || today} aria-describedby={`${id}-error`} onChange={(e) => change({ end: e.target.value })} />
          </div>
        )}
        <button type="submit" className="search__btn">
          <Icon name="whatsapp" />
          <span className="search__btn-label">Book on WhatsApp</span>
        </button>
      </div>
      {car && !withDriver && (
        <div className="book-summary">
          <strong>{car.name}</strong>
          {days > 0 ? (
            <p className="book-summary__price"><strong>{num(car.pricePerDay * days)} RWF</strong><span>{days} {days === 1 ? "day" : "days"} × {num(car.pricePerDay)}</span></p>
          ) : (
            <p className="book-summary__price"><strong>{num(car.pricePerDay)} RWF</strong><span>per day</span></p>
          )}
        </div>
      )}
      <p className="search__hint">
        {withDriver ? "You can tell your driver the drop-off location and timing later." : "We'll agree where to hand over the car on WhatsApp."}
      </p>
      <p className="field__error" id={`${id}-error`} role="alert">{error}</p>
    </form>
  );
}

export function HeroSearch() {
  return <BookingFields />;
}
