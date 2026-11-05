"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as db from "@/lib/db";
import type { Booking, Car, Collections, Cost, Driver, DriverJob } from "@/lib/types";

type Data = {
  cars: Car[];
  drivers: Driver[];
  bookings: Booking[];
  jobs: DriverJob[];
  costs: Cost[];
};

type Value = Data & {
  loading: boolean;
  save: <N extends keyof Collections>(name: N, row: Collections[N]) => Promise<void>;
  remove: (name: keyof Collections, id: string) => Promise<void>;
  reload: () => Promise<void>;
};

const Context = createContext<Value | null>(null);
const EMPTY: Data = { cars: [], drivers: [], bookings: [], jobs: [], costs: [] };

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(EMPTY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [cars, drivers, bookings, jobs, costs] = await Promise.all([db.list("cars"), db.list("drivers"), db.list("bookings"), db.list("jobs"), db.list("costs")]);
    setData({ cars, drivers, bookings, jobs, costs });
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const value = useMemo<Value>(() => ({
    ...data,
    loading,
    reload,
    save: async (name, row) => { await db.save(name, row); await reload(); },
    remove: async (name, id) => { await db.remove(name, id); await reload(); },
  }), [data, loading, reload]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useData() {
  const value = useContext(Context);
  if (!value) throw new Error("useData must be used inside DataProvider");
  return value;
}
