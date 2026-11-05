import { adminRoute } from "@/lib/server/api";
import { RecordError, isCollection, listRecords } from "@/lib/server/records";

type Context = { params: Promise<{ collection: string }> };

export const GET = adminRoute(async (_request: Request, { params }: Context) => {
  const { collection } = await params;
  if (!isCollection(collection)) throw new RecordError("Not found.", 404);
  return listRecords(collection);
});
