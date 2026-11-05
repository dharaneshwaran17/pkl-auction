import { jsonError } from "@/lib/api";
import { getAuctionResult, summaryCsv } from "@/lib/auction/finalize";
import { prisma } from "@/lib/prisma";
import type { AuctionScoreResult } from "@/lib/scoring/auctionScoring";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const result = await getAuctionResult(prisma, id);
    const csv = summaryCsv(result.resultSnapshot as unknown as AuctionScoreResult);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auction-${id}-summary.csv"`,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}
