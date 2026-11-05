import { jsonError } from "@/lib/api";
import { HttpError } from "@/lib/auction/finalize";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = (await request.json()) as { code?: string };
    const code = (body.code ?? "").trim().toUpperCase();
    const auction = await prisma.auction.findUnique({ where: { code } });
    if (!auction) throw new HttpError(404, "Auction code not found");
    return Response.json({ auctionId: auction.id, status: auction.status });
  } catch (err) {
    return jsonError(err);
  }
}
