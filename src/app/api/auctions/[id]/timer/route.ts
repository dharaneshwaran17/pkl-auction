import { jsonError } from "@/lib/api";
import { requireHost } from "@/lib/auction/auth";
import { AuctionEngine } from "@/lib/auction/engine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireHost(request, id);

    const body = (await request.json().catch(() => ({}))) as { duration?: number; timerDuration?: number };
    const seconds = body.duration ?? body.timerDuration ?? 15;

    const newDuration = AuctionEngine.setTimerDuration(id, seconds);
    return Response.json({ ok: true, timerDuration: newDuration });
  } catch (err) {
    return jsonError(err);
  }
}
