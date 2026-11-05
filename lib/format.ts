const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short" });

export const num = (n: number) => number.format(n);
export const rwf = (n: number) => `${number.format(n)} RWF`;

export function compact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${+(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// Dates are plain YYYY-MM-DD strings, parsed as local time so they never shift a day.
export const parseDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export function toISO(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, days: number) {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export const formatDate = (iso: string) => dateFmt.format(parseDate(iso));
export const monthLabel = (iso: string) => monthFmt.format(parseDate(iso));

// Number of rental days; a same-day rental counts as one.
export function daysBetween(start: string, end: string) {
  const ms = parseDate(end).getTime() - parseDate(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
