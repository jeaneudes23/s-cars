import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const digest = (text: string) => createHash("sha256").update(text).digest();
const matches = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

// The credentials stay on the server: they come from .env and never reach the browser.
export async function POST(request: Request) {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Sign-in isn't set up. Add ADMIN_USERNAME and ADMIN_PASSWORD to the .env file." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const usernameOk = matches(username, ADMIN_USERNAME);
  const passwordOk = matches(password, ADMIN_PASSWORD);
  return NextResponse.json({ ok: usernameOk && passwordOk }, { status: usernameOk && passwordOk ? 200 : 401 });
}
