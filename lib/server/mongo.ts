import { MongoClient, type Db } from "mongodb";

// One shared connection per server process, reused across requests and hot reloads.
const store = globalThis as typeof globalThis & { scarsDb?: Promise<Db> };

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "scars");
  // MongoDB removes sessions by itself once they expire.
  await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return db;
}

export function getDb() {
  store.scarsDb ??= connect().catch((err) => {
    store.scarsDb = undefined; // let the next request try again
    throw err;
  });
  return store.scarsDb;
}
