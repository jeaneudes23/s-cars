"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { WHATSAPP_NUMBER } from "@/lib/config";
import { daysBetween, formatDate, num, todayISO } from "@/lib/format";
import type { Car } from "@/lib/types";
import { BookingFields } from "./HeroSearch";

export type RentalMode = "self-drive" | "driver";

// The visitor's choices, shared by the hero form, the fleet and the booking dialog.
export type BookingForm = { mode: RentalMode; carId: string; pickup: string; start: string; time: string; end: string };

type Value = {
  form: BookingForm;
  update: (patch: Partial<BookingForm>) => void;
  cars: Car[];
  days: number; // rental days for the chosen dates, 0 until they are valid
  openBooking: (carId?: string) => void;
};

const Context = createContext<Value | null>(null);

export function rentalDays(form: BookingForm) {
  if (!form.start || !form.end || form.start < todayISO() || form.end < form.start) return 0;
  return daysBetween(form.start, form.end);
}

export function BookingProvider({ cars, children }: { cars: Car[]; children: React.ReactNode }) {
  const [form, setForm] = useState<BookingForm>({ mode: "self-drive", carId: "", pickup: "", start: "", time: "", end: "" });
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const update = useCallback((patch: Partial<BookingForm>) => setForm((f) => ({ ...f, ...patch })), []);
  const openBooking = useCallback((carId?: string) => {
    if (carId !== undefined) setForm((f) => ({ ...f, carId }));
    setOpen(true);
  }, []);

  const days = rentalDays(form);
  const value = useMemo(() => ({ form, update, cars, days, openBooking }), [form, update, cars, days, openBooking]);

  return (
    <Context.Provider value={value}>
      {children}
      <dialog ref={dialog} className="book-dialog" aria-labelledby="bookDialogTitle" onCancel={(e) => { e.preventDefault(); setOpen(false); }}>
        {open && (
          <>
            <div className="book-dialog__head">
              <h2 id="bookDialogTitle">Book your car</h2>
              <button type="button" className="book-dialog__close" aria-label="Close" onClick={() => setOpen(false)}><Icon name="x" /></button>
            </div>
            <BookingFields stacked onDone={() => setOpen(false)} />
          </>
        )}
      </dialog>
    </Context.Provider>
  );
}

export function useBooking() {
  const value = useContext(Context);
  if (!value) throw new Error("useBooking must be used inside BookingProvider");
  return value;
}

const whatsappUrl = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

// Only what the visitor actually chose goes in the message.
export function bookingLink(form: BookingForm, cars: Car[]) {
  const car = cars.find((c) => c.id === form.carId);
  const days = rentalDays(form);
  if (form.mode === "self-drive") {
    const lines = [
      "Hello SCARS! I'd like to book a self-drive car.",
      car ? `Car: ${car.name}` : "Car: please suggest one",
      `Start: ${formatDate(form.start)}`,
      `Return: ${formatDate(form.end)}`,
    ];
    if (car) lines.push(`Price: ${num(car.pricePerDay * days)} RWF (${days} ${days === 1 ? "day" : "days"} at ${num(car.pricePerDay)} RWF/day)`);
    return whatsappUrl(lines.join("\n"));
  }
  return whatsappUrl([
    "Hello SCARS! I'd like to book a car with a driver.",
    car ? `Car: ${car.name} (${num(car.pricePerDay)} RWF/day)` : "Car: please suggest one",
    `Pick-up location: ${form.pickup.trim()}`,
    `Pick-up: ${formatDate(form.start)} at ${form.time}`,
    "Drop-off and timing: I'll confirm later",
  ].join("\n"));
}

// A plain conversation with SCARS, for anything that isn't a booking yet.
export function ChatLink({ message = "Hello SCARS! I have a question.", children, ...props }: { message?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">{children}</a>;
}

// Opens the booking form, with a car already chosen when one is given.
export function BookButton({ carId, children, ...props }: { carId?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { openBooking } = useBooking();
  return <button type="button" {...props} onClick={() => openBooking(carId)}>{children}</button>;
}
