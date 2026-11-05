import type { Prisma, PrismaClient } from "@prisma/client";
import { RESULTS_CSV_NOTE, toCsv } from "../csv";
import { emitToAuction } from "../realtime";
import { SCORING_CONFIG } from "../scoring/auctionScoring.config";
import { scoreAuction, type AuctionScoreResult } from "../scoring/auctionScoring";

export class HttpError extends Error {
  status: number;
  payload?: unknown;
  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function mapRole(role: string): "raider" | "defender" | "allRounder" {
  if (role === "raider" || role === "defender" || role === "allRounder") return role;
  return "allRounder";
}

export async function loadScoringInput(db: PrismaClient | Prisma.TransactionClient, auctionId: string) {
  const auction = await db.auction.findUnique({
    where: { id: auctionId },
    include: {
      teams: { orderBy: { name: "asc" } },
      purchases: { include: { player: true, team: true } },
    },
  });
  if (!auction) throw new HttpError(404, "Auction not found");

  const integrityWarnings: string[] = [];
  const teams = auction.teams.map((team) => {
    const confirmed = auction.purchases
      .filter((p) => p.teamId === team.id)
      .map((p) => ({
        playerId: p.playerId,
        name: p.player.name,
        role: mapRole(p.player.role),
        rating: p.player.rating,
        basePrice: p.basePrice,
        soldPrice: p.soldPrice,
      }));
    const spent = confirmed.reduce((sum, p) => sum + p.soldPrice, 0);
    const remaining = team.initialPurse - spent;
    if (team.currentPurse !== remaining) {
      integrityWarnings.push(
        `Team ${team.name} stored purse ${team.currentPurse} differs from ledger remaining ${remaining}; ledger used.`,
      );
    }
    return {
      teamId: team.id,
      teamName: team.name,
      logoUrl: team.logoUrl,
      colorPrimary: team.colorPrimary,
      colorSecondary: team.colorSecondary,
      initialPurse: team.initialPurse,
      confirmedPurchases: confirmed,
      ledgerRemaining: remaining,
    };
  });

  return { auction, teams, integrityWarnings };
}

export async function endAuction(db: PrismaClient, auctionId: string, userId?: string) {
  const existing = await db.auction.findUnique({
    where: { id: auctionId },
    include: { result: true, host: true },
  });
  if (!existing) throw new HttpError(404, "Auction not found");

  if (userId && existing.hostId !== userId) {
    throw new HttpError(403, "Only the auction host can end the auction");
  }

  const isCompleted = (existing.status as string) === "ENDED" || (existing.status as string) === "COMPLETED";
  if (isCompleted && existing.result) {
    return existing.result;
  }

  const saved = await db.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { result: true },
    });
    if (!auction) throw new HttpError(404, "Auction not found");
    const isAlreadyCompleted = (auction.status as string) === "ENDED" || (auction.status as string) === "COMPLETED";
    if (isAlreadyCompleted && auction.result) return auction.result;
    
    const isValidToEnd = (auction.status as string) === "LIVE" || (auction.status as string) === "PAUSED";
    if (!isValidToEnd) {
      throw new HttpError(409, "Auction must be LIVE or PAUSED to end", { status: auction.status });
    }

    if (auction.currentLotId) {
      const lot = await tx.lot.findUnique({ where: { id: auction.currentLotId } });
      if (lot && ((lot.status as string) === "OPEN" || (lot.status as string) === "ACTIVE")) {
        await tx.lot.update({
          where: { id: lot.id },
          data: { status: "CANCELLED", endedAt: new Date() },
        });
        await tx.player.update({
          where: { id: lot.playerId },
          data: { status: "UNSOLD" },
        });
      }
    }

    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "ENDED", currentLotId: null },
    });

    const { teams, integrityWarnings } = await loadScoringInput(tx, auctionId);

    for (const team of teams) {
      await tx.team.update({
        where: { id: team.teamId },
        data: { currentPurse: team.ledgerRemaining },
      });
    }

    const scored = scoreAuction({ teams }, SCORING_CONFIG);
    const calculatedAt = new Date();

    return tx.auctionResult.create({
      data: {
        auctionId,
        status: scored.status,
        scoringConfigVersion: SCORING_CONFIG.version,
        scoringConfigSnapshot: SCORING_CONFIG as unknown as Prisma.InputJsonValue,
        resultSnapshot: scored as unknown as Prisma.InputJsonValue,
        calculatedAt,
        integrityWarnings: integrityWarnings as unknown as Prisma.InputJsonValue,
      },
    });
  });

  emitToAuction(auctionId, "auction:finalized", { auctionId });
  return saved;
}

export async function getAuctionResult(db: PrismaClient, auctionId: string) {
  const auction = await db.auction.findUnique({
    where: { id: auctionId },
    include: { result: true },
  });
  if (!auction) throw new HttpError(404, "Auction not found");
  const isEnded = (auction.status as string) === "ENDED" || (auction.status as string) === "COMPLETED";
  if (!isEnded || !auction.result) {
    throw new HttpError(409, "Results are not ready", { status: auction.status });
  }
  return auction.result;
}

export function summaryCsv(snapshot: AuctionScoreResult): string {
  return toCsv(
    RESULTS_CSV_NOTE,
    [
      "rank",
      "team",
      "status",
      "final_score",
      "raider_score",
      "defender_score",
      "allrounder_score",
      "balance_score",
      "purse_score",
      "players_bought",
      "raiders",
      "defenders",
      "allrounders",
      "total_spent",
      "remaining_purse",
    ],
    snapshot.teams.map((team) => [
      team.rank ?? "",
      team.teamName,
      team.eligible ? "Eligible" : "Ineligible",
      team.finalScore,
      team.categoryScores.raider,
      team.categoryScores.defender,
      team.categoryScores.allRounder,
      team.categoryScores.balance,
      team.categoryScores.purse,
      team.playersBought,
      team.roleCounts.raider,
      team.roleCounts.defender,
      team.roleCounts.allRounder,
      team.totalSpent,
      team.remainingPurse,
    ]),
  );
}

export function squadsCsv(snapshot: AuctionScoreResult): string {
  const rows: Array<Array<string | number>> = [];
  for (const team of snapshot.teams) {
    for (const player of team.purchases) {
      rows.push([
        team.teamName,
        player.name,
        player.role,
        player.rating,
        player.basePrice,
        player.soldPrice,
      ]);
    }
  }
  return toCsv(
    RESULTS_CSV_NOTE,
    ["team", "player", "role", "rating", "base_price", "sold_price"],
    rows,
  );
}
