import { addDays, todayISO } from "./format";
import type { Booking, Car, Cost, Driver, DriverJob } from "./types";

// Sample data so the admin isn't empty on first open. All of it is invented.

export const seedCars: Car[] = [
  { id: "polo", name: "Volkswagen Polo", plate: "RAF 214 C", cls: "Economy hatchback", category: "economy", image: "/images/polo.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 2, pricePerDay: 45000, status: "available", showOnSite: true },
  { id: "camry", name: "Toyota Camry", plate: "RAD 871 B", cls: "Comfort sedan", category: "economy", image: "/images/camry.jpg", seats: 5, gear: "Automatic", fuel: "Hybrid", bags: 3, pricePerDay: 70000, tag: "Popular", status: "available", showOnSite: true },
  { id: "crv", name: "Honda CR-V", plate: "RAE 502 A", cls: "Compact SUV", category: "suv", image: "/images/crv.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 4, pricePerDay: 80000, status: "available", showOnSite: true },
  { id: "rav4", name: "Toyota RAV4", plate: "RAG 330 D", cls: "Compact SUV", category: "suv", image: "/images/rav4.jpg", seats: 5, gear: "Automatic", fuel: "Hybrid", bags: 4, pricePerDay: 85000, tag: "Best value", status: "available", showOnSite: true },
  { id: "tacoma", name: "Toyota Tacoma 4x4", plate: "RAC 118 F", cls: "Double-cab pickup", category: "4x4", image: "/images/tacoma.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 5, pricePerDay: 110000, status: "available", showOnSite: true },
  { id: "expedition", name: "Ford Expedition", plate: "RAB 645 E", cls: "Full-size 4x4 SUV", category: "4x4", image: "/images/expedition.jpg", seats: 7, gear: "Automatic", fuel: "Petrol", bags: 6, pricePerDay: 150000, tag: "Safari ready", status: "available", showOnSite: true },
  { id: "audi", name: "Audi A6", plate: "RAH 407 A", cls: "Executive sedan", category: "luxury", image: "/images/audi.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 3, pricePerDay: 160000, status: "available", showOnSite: true },
  { id: "cls", name: "Mercedes-Benz CLS", plate: "RAF 990 B", cls: "Luxury coupé sedan", category: "luxury", image: "/images/cls.jpg", seats: 4, gear: "Automatic", fuel: "Petrol", bags: 2, pricePerDay: 220000, tag: "Weddings", status: "available", showOnSite: true },
];

export const seedDrivers: Driver[] = [
  { id: "d1", name: "Eric Mugisha", phone: "+250 788 100 201", licence: "RW-1048821", dayRate: 25000, active: true },
  { id: "d2", name: "Aline Uwase", phone: "+250 788 100 202", licence: "RW-1093377", dayRate: 25000, active: true },
  { id: "d3", name: "Patrick Niyonzima", phone: "+250 788 100 203", licence: "RW-1120456", dayRate: 30000, active: true },
  { id: "d4", name: "Grace Ingabire", phone: "+250 788 100 204", licence: "RW-1187090", dayRate: 30000, active: false },
];

const CUSTOMERS = ["Jean Habimana", "Sarah Miller", "Claudine Mukamana", "David Okoye", "Yves Ndayisaba", "Amina Hassan", "Thomas Keller", "Divine Iradukunda", "Grace Wanjiru", "Kevin Rugamba", "Marie Dubois", "Samuel Bizimana"];
const PLACES = ["Kigali International Airport (KGL)", "Kigali City Centre", "Kimihurura", "Nyarutarama", "Kacyiru", "Remera"];
const TIMES = ["07:30", "08:00", "09:00", "10:30", "14:00", "16:30"];
const JOBS = ["Airport transfer", "City chauffeur", "Day trip", "Long distance"];
const REPAIRS = ["Brake pads", "Oil and filter service", "New tyres", "Suspension repair", "Battery replacement", "AC service"];
const OTHER_COSTS = ["Car wash contract", "Insurance instalment", "Parking and tolls", "Office supplies"];

// Small seeded generator: the sample numbers stay stable between resets.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSeed() {
  const rand = random(20261103);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const round = (n: number, step = 500) => Math.round(n / step) * step;

  const today = todayISO();
  const bookings: Booking[] = [];
  const jobs: DriverJob[] = [];
  const costs: Cost[] = [];
  const active = seedDrivers.filter((d) => d.active);

  // Walk each car's calendar from a year ago to two weeks ahead, without overlaps.
  seedCars.forEach((car, i) => {
    let cursor = addDays(today, -360 + between(0, 9));
    let n = 0;
    while (cursor < addDays(today, 14)) {
      const end = addDays(cursor, between(2, 7));
      const finished = end < today;
      const cancelled = rand() < 0.05;
      bookings.push({
        id: `b-${i}-${n++}`,
        customer: pick(CUSTOMERS),
        phone: `+250 78${between(0, 9)} ${between(100, 999)} ${between(100, 999)}`,
        carId: car.id,
        start: cursor,
        end,
        dailyRate: car.pricePerDay,
        status: cancelled ? "cancelled" : finished ? "completed" : "booked",
        paid: !cancelled && (end < addDays(today, -30) || rand() > 0.3),
      });
      cursor = addDays(end, between(1, 7));
    }
  });

  // A car that nothing else holds on this date, so sample services never clash.
  const freeCar = (date: string) => seedCars.filter((c) =>
    !bookings.some((b) => b.carId === c.id && b.status !== "cancelled" && b.start <= date && date <= b.end)
    && !jobs.some((j) => j.carId === c.id && j.date === date));

  function addService(id: string, date: string) {
    const free = freeCar(date);
    if (!free.length) return;
    jobs.push({
      id,
      driverId: pick(active).id,
      carId: pick(free).id,
      date,
      type: pick(JOBS),
      pickup: pick(PLACES),
      pickupTime: pick(TIMES),
      customer: pick(CUSTOMERS),
      phone: `+250 78${between(0, 9)} ${between(100, 999)} ${between(100, 999)}`,
      amount: round(between(40000, 180000), 5000),
      paid: date > today ? rand() > 0.5 : rand() > 0.08,
    });
  }

  for (const offset of [1, 3, 5]) addService(`j-next-${offset}`, addDays(today, offset));

  // Monthly driver services and costs for the past 12 months.
  for (let m = 0; m < 12; m++) {
    const monthEnd = addDays(today, -m * 30);
    for (let j = 0; j < between(4, 8); j++) addService(`j-${m}-${j}`, addDays(monthEnd, -between(0, 29)));
    seedCars.forEach((car, c) => {
      costs.push({
        id: `f-${m}-${c}`,
        date: addDays(monthEnd, -between(0, 29)),
        category: "fuel",
        carId: car.id,
        description: "Fuel top-ups",
        amount: round(car.pricePerDay * (0.8 + rand() * 1.4)),
      });
      if (rand() < 0.3) {
        costs.push({
          id: `r-${m}-${c}`,
          date: addDays(monthEnd, -between(0, 29)),
          category: "repair",
          carId: car.id,
          description: pick(REPAIRS),
          amount: round(between(60000, 450000), 5000),
        });
      }
    });
    costs.push({
      id: `o-${m}`,
      date: addDays(monthEnd, -between(0, 29)),
      category: "other",
      description: pick(OTHER_COSTS),
      amount: round(between(80000, 300000), 5000),
    });
  }

  return { cars: seedCars, drivers: seedDrivers, bookings, jobs, costs };
}
