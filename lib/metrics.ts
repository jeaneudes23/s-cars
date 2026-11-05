import { addDays, daysBetween, monthLabel, parseDate, toISO } from "./format";
import type { Booking, Car, Cost, Driver, DriverJob } from "./types";

export const rentalAmount = (b: Booking) => daysBetween(b.start, b.end) * b.dailyRate;
export const bookingTotal = (b: Booking) => rentalAmount(b) + b.driverFee;

export type BookingState = "Upcoming" | "On rent" | "Completed" | "Cancelled";

export function bookingState(b: Booking, today: string): BookingState {
  if (b.status === "cancelled") return "Cancelled";
  if (b.status === "completed") return "Completed";
  return b.start > today ? "Upcoming" : "On rent";
}

// True if a non-cancelled booking of this car overlaps the given dates.
export function findOverlap(bookings: Booking[], carId: string, start: string, end: string, ignoreId?: string) {
  return bookings.find(
    (b) => b.id !== ignoreId && b.carId === carId && b.status !== "cancelled" && b.start <= end && start <= b.end,
  );
}

// ---------------------------------------------------------------------------
// Revenue: one entry per income line, dated on the day the work starts.
// A booking with a driver gives two entries, so each source can be reported.
// ---------------------------------------------------------------------------
export type RevenueSource = "rental" | "driver";

export type RevenueEntry = {
  id: string;
  date: string;
  source: RevenueSource;
  description: string;
  customer: string;
  amount: number;
  paid: boolean;
  carId?: string;
  driverId?: string;
  ref: { kind: "booking" | "job"; id: string };
};

export function revenueEntries(bookings: Booking[], jobs: DriverJob[], cars: Car[], drivers: Driver[]) {
  const carName = (id: string) => cars.find((c) => c.id === id)?.name ?? "Removed car";
  const driverName = (id?: string) => drivers.find((d) => d.id === id)?.name ?? "Removed driver";
  const entries: RevenueEntry[] = [];

  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const ref = { kind: "booking" as const, id: b.id };
    entries.push({ id: `${b.id}-rental`, date: b.start, source: "rental", description: carName(b.carId), customer: b.customer, amount: rentalAmount(b), paid: b.paid, carId: b.carId, ref });
    if (b.driverId && b.driverFee > 0) {
      entries.push({ id: `${b.id}-driver`, date: b.start, source: "driver", description: `${driverName(b.driverId)}, with ${carName(b.carId)}`, customer: b.customer, amount: b.driverFee, paid: b.paid, driverId: b.driverId, ref });
    }
  }
  for (const j of jobs) {
    entries.push({ id: j.id, date: j.date, source: "driver", description: `${driverName(j.driverId)}, ${j.type.toLowerCase()}`, customer: j.customer, amount: j.amount, paid: j.paid, driverId: j.driverId, ref: { kind: "job", id: j.id } });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export const sum = <T,>(rows: T[], value: (row: T) => number) => rows.reduce((total, row) => total + value(row), 0);

// ---------------------------------------------------------------------------
// Periods
// ---------------------------------------------------------------------------
export type PeriodKey = "month" | "3m" | "12m";
export const PERIODS: { key: PeriodKey; label: string; months: number }[] = [
  { key: "month", label: "This month", months: 1 },
  { key: "3m", label: "3 months", months: 3 },
  { key: "12m", label: "12 months", months: 12 },
];

const monthStart = (today: string, back: number) => {
  const d = parseDate(today);
  return toISO(new Date(d.getFullYear(), d.getMonth() - back, 1));
};

// Same day of the month, `back` months ago (or that month's last day if shorter).
function sameDayBack(today: string, back: number) {
  const lastDay = addDays(monthStart(today, back - 1), -1);
  const day = parseDate(today).getDate();
  return day <= parseDate(lastDay).getDate() ? `${lastDay.slice(0, 8)}${today.slice(8)}` : lastDay;
}

// A period runs from the first of a month up to today. The previous period stops
// at the same point, so the 3rd of this month compares with the 3rd of last month.
export function periodRange(today: string, months: number) {
  return {
    start: monthStart(today, months - 1),
    end: today,
    prevStart: monthStart(today, months * 2 - 1),
    prevEnd: sameDayBack(today, months),
  };
}

export const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

// Empty month buckets, oldest first, ending with the current month.
export function monthBuckets(today: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const start = monthStart(today, count - 1 - i);
    return { key: start.slice(0, 7), label: monthLabel(start) };
  });
}

export function monthlySeries(today: string, count: number, entries: RevenueEntry[], costs: Cost[]) {
  const paid = entries.filter((e) => e.paid && e.date <= today);
  return monthBuckets(today, count).map(({ key, label }) => {
    const month = paid.filter((e) => e.date.startsWith(key));
    const rentals = sum(month.filter((e) => e.source === "rental"), (e) => e.amount);
    const driver = sum(month.filter((e) => e.source === "driver"), (e) => e.amount);
    return {
      label,
      rentals,
      driver,
      revenue: rentals + driver,
      costs: sum(costs.filter((c) => c.date.startsWith(key) && c.date <= today), (c) => c.amount),
    };
  });
}
