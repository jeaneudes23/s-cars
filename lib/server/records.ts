import { Binary, type Document } from "mongodb";
import { formatDate } from "@/lib/format";
import type { Car, Collections } from "@/lib/types";
import { getDb } from "./mongo";

export class RecordError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type Name = keyof Collections;

// What each record may contain. Anything else sent to the server is dropped.
// A trailing ? marks an optional field; a list of words is a fixed set of choices.
const SCHEMAS: Record<Name, Record<string, string>> = {
  cars: { name: "text", plate: "text", category: "economy|suv|4x4|luxury", cls: "text", seats: "number", gear: "Automatic|Manual", fuel: "Petrol|Diesel|Hybrid|Electric", bags: "number", pricePerDay: "number", image: "text", tag: "text?", status: "available|maintenance|retired", showOnSite: "boolean" },
  drivers: { name: "text", phone: "text?", licence: "text?", dayRate: "number", active: "boolean" },
  bookings: { customer: "text", phone: "text?", carId: "text", start: "date", end: "date", dailyRate: "number", status: "booked|completed|cancelled", paid: "boolean", notes: "text?" },
  jobs: { driverId: "text", carId: "text?", date: "date", type: "text", pickup: "text?", pickupTime: "text?", customer: "text", phone: "text?", amount: "number", paid: "boolean", notes: "text?" },
  costs: { date: "date", category: "fuel|repair|other", carId: "text?", description: "text", amount: "number" },
};

export const isCollection = (name: string): name is Name => Object.hasOwn(SCHEMAS, name);

function clean(name: Name, input: Record<string, unknown>) {
  const output: Document = {};
  for (const [field, rule] of Object.entries(SCHEMAS[name])) {
    const optional = rule.endsWith("?");
    const type = rule.replace("?", "");
    const value = input[field];
    if (value === undefined || value === null || value === "") {
      if (optional) continue;
      throw new RecordError(`${field} is required.`);
    }
    const valid =
      type === "text" ? typeof value === "string"
      : type === "number" ? typeof value === "number" && Number.isFinite(value) && value >= 0
      : type === "boolean" ? typeof value === "boolean"
      : type === "date" ? typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      : type.split("|").includes(String(value));
    if (!valid) throw new RecordError(`${field} isn't valid.`);
    output[field] = value;
  }
  return output;
}

const collection = async (name: string) => (await getDb()).collection<Document & { _id: string }>(name);
const toRecord = ({ _id, ...rest }: Document) => ({ id: _id, ...rest });

export async function listRecords(name: Name) {
  return (await (await collection(name)).find().toArray()).map(toRecord);
}

// The same car can't be out twice, whether the other record is a booking or a driver service.
async function assertCarFree(carId: string, start: string, end: string, ignoreId: string) {
  const booking = await (await collection("bookings")).findOne({ _id: { $ne: ignoreId }, carId, status: { $ne: "cancelled" }, start: { $lte: end }, end: { $gte: start } });
  const job = booking ? null : await (await collection("jobs")).findOne({ _id: { $ne: ignoreId }, carId, date: { $gte: start, $lte: end } });
  const clash = booking ? { customer: booking.customer, start: booking.start, end: booking.end } : job && { customer: job.customer, start: job.date, end: job.date };
  if (clash) throw new RecordError(`This car is already taken by ${clash.customer} from ${formatDate(clash.start)} to ${formatDate(clash.end)}. Pick another car or change the dates.`, 409);
}

const PHOTO_PREFIX = "data:image/jpeg;base64,";
const MAX_PHOTO_BYTES = 2_000_000;

// An uploaded photo moves to its own collection, so lists of cars stay small.
async function storePhoto(id: string, image: string) {
  if (!image.startsWith("data:")) return image;
  if (!image.startsWith(PHOTO_PREFIX)) throw new RecordError("Photos must be JPG images.");
  const bytes = Buffer.from(image.slice(PHOTO_PREFIX.length), "base64");
  if (bytes.length > MAX_PHOTO_BYTES) throw new RecordError("That photo is too large. Try a smaller one.");
  await (await collection("carPhotos")).replaceOne({ _id: id }, { data: new Binary(bytes) }, { upsert: true });
  return `/api/cars/${encodeURIComponent(id)}/photo?v=${Date.now()}`;
}

export async function saveRecord(name: Name, id: string, input: Record<string, unknown>) {
  const record = clean(name, input);
  if (name === "bookings" && record.status !== "cancelled") {
    if (record.end < record.start) throw new RecordError("The return date can't be before the start date.");
    await assertCarFree(record.carId, record.start, record.end, id);
  }
  if (name === "jobs" && record.carId) await assertCarFree(record.carId, record.date, record.date, id);
  if (name === "cars") record.image = await storePhoto(id, record.image);

  await (await collection(name)).replaceOne({ _id: id }, record, { upsert: true });
  return { id, ...record };
}

async function hasHistory(name: Name, id: string) {
  const uses = (other: string, field: string) => collection(other).then((c) => c.findOne({ [field]: id }, { projection: { _id: 1 } }));
  if (name === "cars") return (await uses("bookings", "carId")) || (await uses("jobs", "carId")) || (await uses("costs", "carId"));
  if (name === "drivers") return uses("jobs", "driverId");
  return null;
}

export async function removeRecord(name: Name, id: string) {
  if (await hasHistory(name, id)) throw new RecordError("This has records linked to it, so it can't be deleted. Retire it instead.", 409);
  await (await collection(name)).deleteOne({ _id: id });
  if (name === "cars") await (await collection("carPhotos")).deleteOne({ _id: id });
}

// What the public website shows. Never fails the page: no database just means no cars.
export async function listedCars(): Promise<Car[]> {
  try {
    const rows = await (await collection("cars")).find({ showOnSite: true, status: "available" }).sort({ pricePerDay: 1 }).toArray();
    return rows.map(toRecord) as unknown as Car[];
  } catch (err) {
    console.error("Couldn't load cars for the website:", err);
    return [];
  }
}

export async function carPhoto(id: string) {
  const photo = await (await collection("carPhotos")).findOne({ _id: id });
  return photo ? Buffer.from((photo.data as Binary).buffer) : null;
}
