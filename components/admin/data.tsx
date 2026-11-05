"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as db from "@/lib/db";
import type { Booking, Car, Collections, Cost, Driver, DriverJob } from "@/lib/types";
import { useToast } from "./ui";

type Data = {
  cars: Car[];
  drivers: Driver[];
  bookings: Booking[];
  jobs: DriverJob[];
  costs: Cost[];
};

type Value = Data & {
  loading: boolean;
  error: string;
  save: <N extends keyof Collections>(name: N, row: Collections[N]) => Promise<void>;
  remove: (name: keyof Collections, id: string) => Promise<void>;
  reload: () => Promise<void>;
};

const Context = createContext<Value | null>(null);
const EMPTY: Data = { cars: [], drivers: [], bookings: [], jobs: [], costs: [] };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [cars, drivers, bookings, jobs, costs] = await Promise.all([db.list("cars"), db.list("drivers"), db.list("bookings"), db.list("jobs"), db.list("costs")]);
      setData({ cars, drivers, bookings, jobs, costs });
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const value = useMemo<Value>(() => ({
    ...data,
    loading,
    error,
    reload,
    // The screen updates first; if the server refuses, it goes back to what is really saved.
    save: async (name, row) => {
      const put = (value: Collections[typeof name]) => setData((d) => {
        const rows = d[name] as Collections[typeof name][];
        const next = rows.some((r) => r.id === value.id) ? rows.map((r) => (r.id === value.id ? value : r)) : [value, ...rows];
        return { ...d, [name]: next };
      });
      put(row);
      try {
        put(await db.save(name, row));
      } catch (err) {
        await reload();
        throw err;
      }
    },
    remove: async (name, id) => {
      setData((d) => ({ ...d, [name]: (d[name] as { id: string }[]).filter((r) => r.id !== id) }));
      try {
        await db.remove(name, id);
      } catch (err) {
        await reload();
        throw err;
      }
    },
  }), [data, loading, reload]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useData() {
  const value = useContext(Context);
  if (!value) throw new Error("useData must be used inside DataProvider");
  return value;
}

// For one-click changes in a table: confirms straight away, and says so if saving failed.
export function useQuickSave() {
  const { save } = useData();
  const toast = useToast();
  return useCallback(<N extends keyof Collections>(name: N, row: Collections[N], message: string) => {
    toast(message);
    save(name, row).catch((err: Error) => toast(err.message));
  }, [save, toast]);
}

// Shows a clear message and a retry if the admin's data can't be loaded.
export function DataGate({ children }: { children: React.ReactNode }) {
  const { error, loading, reload } = useData();
  if (error && !loading) {
    return (
      <div className="a-empty" role="alert">
        <p>{error}</p>
        <button type="button" className="btn btn--dark" onClick={reload}>Try again</button>
      </div>
    );
  }
  return children;
}
