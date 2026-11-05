import { errorResponse } from "@/lib/server/api";
import { carPhoto } from "@/lib/server/records";

// Public, because the website shows these. The ?v= in each link changes with a new photo,
// so a browser can keep its copy for a long time.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const photo = await carPhoto((await params).id);
    if (!photo) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(photo), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch (err) {
    return errorResponse(err);
  }
}
