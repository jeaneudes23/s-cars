import { NextResponse } from "next/server";
import { isSignedIn } from "./auth";
import { RecordError } from "./records";

// Wraps an admin route: checks the session and turns failures into clear JSON errors.
export function adminRoute<A extends unknown[]>(handler: (...args: A) => Promise<unknown>) {
  return async (...args: A) => {
    try {
      if (!(await isSignedIn())) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
      const result = await handler(...args);
      return result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export function errorResponse(err: unknown) {
  if (err instanceof RecordError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(err);
  return NextResponse.json({ error: "The server couldn't reach the database. Try again in a moment." }, { status: 503 });
}
