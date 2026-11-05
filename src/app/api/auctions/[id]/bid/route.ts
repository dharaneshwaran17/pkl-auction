import { jsonError } from "@/lib/api";
import { AuctionEngine } from "@/lib/auction/engine";
import { requireUser } from "@/lib/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as { amount?: number };

    const amount = Number(body.amount);
    const bid = await AuctionEngine.placeBid(id, user.id, amount);
    return Response.json({ ok: true, bid });
  } catch (err) {
    return jsonError(err);
  }
}
