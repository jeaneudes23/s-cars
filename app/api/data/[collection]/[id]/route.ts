import { adminRoute } from "@/lib/server/api";
import { RecordError, isCollection, removeRecord, saveRecord } from "@/lib/server/records";

type Context = { params: Promise<{ collection: string; id: string }> };

export const PUT = adminRoute(async (request: Request, { params }: Context) => {
  const { collection, id } = await params;
  if (!isCollection(collection)) throw new RecordError("Not found.", 404);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") throw new RecordError("That record isn't valid.");
  return saveRecord(collection, id, body);
});

export const DELETE = adminRoute(async (_request: Request, { params }: Context) => {
  const { collection, id } = await params;
  if (!isCollection(collection)) throw new RecordError("Not found.", 404);
  await removeRecord(collection, id);
});
