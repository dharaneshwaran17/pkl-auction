import { jsonError } from "@/lib/api";
import { requireHost } from "@/lib/auction/auth";
import { AuctionEngine } from "@/lib/auction/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Auto-advance / Bring Next Lot is strictly host-only
    await requireHost(request, id);

    // If host explicitly clicked to advance lot, resume or progress
    await AuctionEngine.resume(id);
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
