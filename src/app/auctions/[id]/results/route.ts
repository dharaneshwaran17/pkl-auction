import { jsonError } from "@/lib/api";
import { getAuctionResult } from "@/lib/auction/finalize";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [result, auction] = await Promise.all([
      getAuctionResult(prisma, id),
      prisma.auction.findUnique({
        where: { id },
        select: {
          code: true,
          name: true,
          teams: {
            select: {
              id: true,
              name: true,
              owner: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return Response.json({
      auctionId: result.auctionId,
      code: auction?.code ?? id.slice(0, 6).toUpperCase(),
      auctionName: auction?.name,
      teamOwners: auction?.teams ?? [],
      status: result.status,
      scoringConfigVersion: result.scoringConfigVersion,
      scoringConfigSnapshot: result.scoringConfigSnapshot,
      resultSnapshot: result.resultSnapshot,
      calculatedAt: result.calculatedAt,
      integrityWarnings: result.integrityWarnings,
    });
  } catch (err) {
    return jsonError(err);
  }
}
