import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/server/api";
import { changeCredentials, currentUsername } from "@/lib/server/auth";

export const GET = adminRoute(async () => ({ username: await currentUsername() }));

export const PUT = adminRoute(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const failed = await changeCredentials({
    currentPassword: String(body.currentPassword ?? ""),
    username: String(body.username ?? ""),
    newPassword: body.newPassword ? String(body.newPassword) : undefined,
  });
  return failed ? NextResponse.json(failed, { status: 400 }) : { ok: true };
});
