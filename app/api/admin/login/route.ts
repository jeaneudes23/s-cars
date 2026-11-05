import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/api";
import { login } from "@/lib/server/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const username = typeof body?.username === "string" ? body.username : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const result = await login(username, password);
    if (result === "ok") return NextResponse.json({ ok: true });
    if (result === "locked") return NextResponse.json({ error: "Too many failed attempts. Try again in 15 minutes." }, { status: 429 });
    return NextResponse.json({ error: "That username or password is wrong. Check them and try again." }, { status: 401 });
  } catch (err) {
    return errorResponse(err);
  }
}
