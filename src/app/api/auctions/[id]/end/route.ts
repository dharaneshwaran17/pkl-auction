import { jsonError } from "@/lib/api";
import { requireHost } from "@/lib/auction/auth";
import { AuctionEngine } from "@/lib/auction/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Strict host authorization check: rejects unauthorized participants with 403
    await requireHost(request, id);

    const result = await AuctionEngine.end(id);
    return Response.json({ result });
  } catch (err) {
    return jsonError(err);
  }
}
