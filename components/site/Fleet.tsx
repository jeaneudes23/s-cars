"use client";

import Image from "next/image";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { CATEGORY_LABELS } from "@/lib/config";
import { num } from "@/lib/format";
import type { CarCategory } from "@/lib/types";
import { BookButton, useBooking } from "./booking";

const FILTERS: { key: "all" | CarCategory; label: string }[] = [
  { key: "all", label: "All" },
  ...(Object.keys(CATEGORY_LABELS) as CarCategory[]).map((key) => ({ key, label: CATEGORY_LABELS[key] })),
];

export function Fleet() {
  const { cars } = useBooking();
  const [filter, setFilter] = useState<"all" | CarCategory>("all");
  const shown = cars.filter((c) => filter === "all" || c.category === filter);

  return (
    <>
      <div className="chips" role="group" aria-label="Filter cars by category">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={`chip ${filter === f.key ? "is-active" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">Showing {shown.length} {shown.length === 1 ? "car" : "cars"}</p>
      {shown.length === 0 && <p className="fleet__empty">No cars in this category right now. Message us and we&apos;ll help you find one.</p>}
      <ul className="fleet__grid">
        {shown.map((c) => (
          <li className="car" key={c.id}>
            <div className="car__media">
              <Image src={c.image} alt={c.name} width={900} height={600} sizes="(max-width: 640px) 100vw, 300px" unoptimized={c.image.startsWith("data:")} />
              {c.tag && <span className="car__tag">{c.tag}</span>}
            </div>
            <div className="car__body">
              <div>
                <h3 className="car__name">{c.name}</h3>
                <span className="car__class">{c.cls}</span>
              </div>
              <ul className="specs">
                <li><Icon name="users" />{c.seats} seats</li>
                <li><Icon name="gear" />{c.gear}</li>
                <li><Icon name="fuel" />{c.fuel}</li>
                <li><Icon name="bag" />{c.bags} bags</li>
              </ul>
              <div className="car__foot">
                <p className="price"><strong>{num(c.pricePerDay)}</strong> RWF<span>per day</span></p>
                <BookButton carId={c.id} className="btn btn--dark" aria-label={`Book the ${c.name}`}>Book</BookButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
