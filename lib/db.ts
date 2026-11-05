import { daysBetween } from "./format";
import { buildSeed } from "./seed";
import type { Booking, Collections, DriverJob } from "./types";

// The only file that knows data lives in localStorage. When the backend arrives,
// replace these functions with API calls; the pages won't need to change.

const PREFIX = "scars.db.";
const SEEDED = `${PREFIX}seeded`;
const SEPARATED = `${PREFIX}driversSeparated`;

type Name = keyof Collections;

function write(name: Name, rows: unknown[]) {
  try {
    localStorage.setItem(PREFIX + name, JSON.stringify(rows));
  } catch {
    throw new Error("This browser's storage is full. Try a smaller car photo or delete old records.");
  }
}

function writeAll(data: { [K in Name]: Collections[K][] }) {
  (Object.keys(data) as Name[]).forEach((name) => write(name, data[name]));
  localStorage.setItem(SEEDED, "1");
  localStorage.setItem(SEPARATED, "1");
}

// Bookings used to be able to carry a driver. Those records move to driver services,
// keeping their full amount, so saved data and revenue totals stay as they were.
function separateDrivers() {
  type Old = Booking & { driverId?: string; driverFee?: number; pickup?: string; pickupTime?: string };
  const old: Old[] = JSON.parse(localStorage.getItem(`${PREFIX}bookings`) ?? "[]");
  const jobs: DriverJob[] = JSON.parse(localStorage.getItem(`${PREFIX}jobs`) ?? "[]");
  const bookings: Booking[] = [];
  for (const { driverId, driverFee = 0, pickup, pickupTime, ...booking } of old) {
    if (!driverId || booking.status === "cancelled") {
      bookings.push(booking);
      continue;
    }
    jobs.unshift({
      id: `${booking.id}-service`,
      driverId,
      carId: booking.carId,
      date: booking.start,
      type: "City chauffeur",
      pickup,
      pickupTime,
      customer: booking.customer,
      phone: booking.phone,
      amount: daysBetween(booking.start, booking.end) * booking.dailyRate + driverFee,
      paid: booking.paid,
      notes: [`Moved from a booking, until ${booking.end}.`, booking.notes].filter(Boolean).join(" "),
    });
  }
  write("bookings", bookings);
  write("jobs", jobs);
  localStorage.setItem(SEPARATED, "1");
}

function ensureSeeded() {
  if (!localStorage.getItem(SEEDED)) writeAll(buildSeed());
  else if (!localStorage.getItem(SEPARATED)) separateDrivers();
}

export async function list<N extends Name>(name: N): Promise<Collections[N][]> {
  ensureSeeded();
  return JSON.parse(localStorage.getItem(PREFIX + name) ?? "[]");
}

export async function save<N extends Name>(name: N, row: Collections[N]) {
  const rows = await list(name);
  const index = rows.findIndex((r) => r.id === row.id);
  if (index >= 0) rows[index] = row;
  else rows.unshift(row);
  write(name, rows);
}

export async function remove(name: Name, id: string) {
  const rows = await list(name);
  write(name, rows.filter((r) => r.id !== id));
}

export async function resetToSample() {
  writeAll(buildSeed());
}

export async function clearAll() {
  writeAll({ cars: [], drivers: [], bookings: [], jobs: [], costs: [] });
}
