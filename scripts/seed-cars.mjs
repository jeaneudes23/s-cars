// Adds the starting fleet to an empty database. Safe to run again: it never
// touches a database that already has cars. Run with: npm run seed
import { MongoClient } from "mongodb";

const cars = [
  { _id: "polo", name: "Volkswagen Polo", plate: "RAF 214 C", cls: "Economy hatchback", category: "economy", image: "/images/polo.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 2, pricePerDay: 45000, status: "available", showOnSite: true },
  { _id: "camry", name: "Toyota Camry", plate: "RAD 871 B", cls: "Comfort sedan", category: "economy", image: "/images/camry.jpg", seats: 5, gear: "Automatic", fuel: "Hybrid", bags: 3, pricePerDay: 70000, tag: "Popular", status: "available", showOnSite: true },
  { _id: "crv", name: "Honda CR-V", plate: "RAE 502 A", cls: "Compact SUV", category: "suv", image: "/images/crv.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 4, pricePerDay: 80000, status: "available", showOnSite: true },
  { _id: "rav4", name: "Toyota RAV4", plate: "RAG 330 D", cls: "Compact SUV", category: "suv", image: "/images/rav4.jpg", seats: 5, gear: "Automatic", fuel: "Hybrid", bags: 4, pricePerDay: 85000, tag: "Best value", status: "available", showOnSite: true },
  { _id: "tacoma", name: "Toyota Tacoma 4x4", plate: "RAC 118 F", cls: "Double-cab pickup", category: "4x4", image: "/images/tacoma.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 5, pricePerDay: 110000, status: "available", showOnSite: true },
  { _id: "expedition", name: "Ford Expedition", plate: "RAB 645 E", cls: "Full-size 4x4 SUV", category: "4x4", image: "/images/expedition.jpg", seats: 7, gear: "Automatic", fuel: "Petrol", bags: 6, pricePerDay: 150000, tag: "Safari ready", status: "available", showOnSite: true },
  { _id: "audi", name: "Audi A6", plate: "RAH 407 A", cls: "Executive sedan", category: "luxury", image: "/images/audi.jpg", seats: 5, gear: "Automatic", fuel: "Petrol", bags: 3, pricePerDay: 160000, status: "available", showOnSite: true },
  { _id: "cls", name: "Mercedes-Benz CLS", plate: "RAF 990 B", cls: "Luxury coupé sedan", category: "luxury", image: "/images/cls.jpg", seats: 4, gear: "Automatic", fuel: "Petrol", bags: 2, pricePerDay: 220000, tag: "Weddings", status: "available", showOnSite: true },
];

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to your .env file first.");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const collection = client.db(process.env.MONGODB_DB || "scars").collection("cars");
  const existing = await collection.countDocuments();
  if (existing) {
    console.log(`The database already has ${existing} cars, so nothing was added.`);
  } else {
    await collection.insertMany(cars);
    console.log(`Added ${cars.length} cars.`);
  }
} catch (err) {
  console.error("Couldn't load the cars:", err.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
