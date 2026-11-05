import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/server/api";
import { logout } from "@/lib/server/auth";

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
