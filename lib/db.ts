import type { Collections } from "./types";

// All the admin's data access. The pages call these; the server does the rest.

type Name = keyof Collections;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }
  if (response.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Please sign in again.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Something went wrong. Try again.");
  return body;
}

const path = (name: Name, id?: string) => `/api/data/${name}${id ? `/${encodeURIComponent(id)}` : ""}`;

export const list = <N extends Name>(name: N) => request<Collections[N][]>(path(name));

// Returns the record as stored: an uploaded photo comes back as a link, for example.
export const save = <N extends Name>(name: N, row: Collections[N]) =>
  request<Collections[N]>(path(name, row.id), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row) });

export const remove = (name: Name, id: string) => request(path(name, id), { method: "DELETE" });
