import { buildSeed } from "./seed";
import type { Collections } from "./types";

// The only file that knows data lives in localStorage. When the backend arrives,
// replace these functions with API calls; the pages won't need to change.

const PREFIX = "scars.db.";
const SEEDED = `${PREFIX}seeded`;

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
}

function ensureSeeded() {
  if (!localStorage.getItem(SEEDED)) writeAll(buildSeed());
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
