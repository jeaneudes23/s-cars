import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getDb } from "./mongo";

const scrypt = promisify(scryptCallback) as (password: string, salt: string, length: number) => Promise<Buffer>;

const COOKIE = "scars_session";
const SESSION_DAYS = 7;
const MAX_FAILURES = 10;
const LOCK_MINUTES = 15;

type Admin = { _id: string; username: string; password: string; failures?: number; lockedUntil?: Date };
type Session = { _id: string; expiresAt: Date };

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}

async function passwordMatches(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(hash, "hex"));
}

const admins = async () => (await getDb()).collection<Admin>("admins");
const sessions = async () => (await getDb()).collection<Session>("sessions");
const tokenId = (token: string) => createHash("sha256").update(token).digest("hex");

// The first sign-in creates the admin from .env. After that, MongoDB is the source of truth.
async function getAdmin() {
  const collection = await admins();
  const existing = await collection.findOne({ _id: "admin" });
  if (existing) return existing;
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) throw new Error("Add ADMIN_USERNAME and ADMIN_PASSWORD to set up the first sign-in.");
  const created: Admin = { _id: "admin", username: ADMIN_USERNAME, password: await hashPassword(ADMIN_PASSWORD) };
  await collection.updateOne({ _id: "admin" }, { $setOnInsert: created }, { upsert: true });
  return (await collection.findOne({ _id: "admin" }))!;
}

export type LoginResult = "ok" | "wrong" | "locked";

export async function login(username: string, password: string): Promise<LoginResult> {
  const admin = await getAdmin();
  if (admin.lockedUntil && admin.lockedUntil > new Date()) return "locked";

  const collection = await admins();
  const passwordOk = await passwordMatches(password, admin.password);
  if (!passwordOk || username.trim() !== admin.username) {
    const failures = (admin.failures ?? 0) + 1;
    const lock = failures >= MAX_FAILURES;
    await collection.updateOne({ _id: "admin" }, {
      $set: { failures: lock ? 0 : failures, ...(lock ? { lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } : {}) },
    });
    return lock ? "locked" : "wrong";
  }

  await collection.updateOne({ _id: "admin" }, { $set: { failures: 0 }, $unset: { lockedUntil: "" } });
  await startSession();
  return "ok";
}

async function startSession() {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await (await sessions()).insertOne({ _id: tokenId(token), expiresAt });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function isSignedIn() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  return !!(await (await sessions()).findOne({ _id: tokenId(token), expiresAt: { $gt: new Date() } }));
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await (await sessions()).deleteOne({ _id: tokenId(token) });
  jar.delete(COOKIE);
}

export async function currentUsername() {
  return (await getAdmin()).username;
}

export type CredentialChange = { currentPassword: string; username: string; newPassword?: string };

// Returns an error message, or null when saved. A new password signs out every other device.
export async function changeCredentials({ currentPassword, username, newPassword }: CredentialChange) {
  const admin = await getAdmin();
  if (!(await passwordMatches(currentPassword, admin.password))) return { field: "current", message: "That isn't your current password." };
  if (!username.trim()) return { field: "username", message: "Enter a username." };
  if (newPassword && newPassword.length < 8) return { field: "next", message: "Use at least 8 characters." };

  await (await admins()).updateOne({ _id: "admin" }, {
    $set: { username: username.trim(), ...(newPassword ? { password: await hashPassword(newPassword) } : {}) },
  });
  if (newPassword) {
    await (await sessions()).deleteMany({});
    await startSession();
  }
  return null;
}
