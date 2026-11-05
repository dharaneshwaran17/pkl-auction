import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { endAuction, summaryCsv, squadsCsv } from "./finalize";
import { HttpError } from "./finalize";
import { DEFAULT_INITIAL_PURSE, buildFictionalPlayers, FICTIONAL_TEAMS } from "./roster";
import type { AuctionScoreResult } from "../scoring/auctionScoring";
import { RESULTS_CSV_NOTE } from "../csv";
import { createPrismaClient } from "../prisma";

const dbPath = path.join(process.cwd(), "dev.db");

const prisma = createPrismaClient();

async function reset() {
  await prisma.auctionResult.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.user.deleteMany();
}

async function seedLiveAuction(opts?: { tamperPurse?: boolean; extraAuctionPurchase?: boolean }) {
  const host = await prisma.user.create({ data: { name: "Host" } });
  const guest = await prisma.user.create({ data: { name: "Guest" } });
  const auction = await prisma.auction.create({
    data: {
      name: "Test",
      code: `T${Date.now().toString(36).slice(-5)}`,
      hostId: host.id,
      status: "LIVE",
      initialPurse: DEFAULT_INITIAL_PURSE,
      teams: {
        create: FICTIONAL_TEAMS.slice(0, 2).map((team) => ({
          name: team.name,
          colorPrimary: team.colorPrimary,
          colorSecondary: team.colorSecondary,
          initialPurse: DEFAULT_INITIAL_PURSE,
          currentPurse: opts?.tamperPurse ? 1 : DEFAULT_INITIAL_PURSE,
        })),
      },
      players: { create: buildFictionalPlayers().slice(0, 20) },
    },
    include: { teams: true, players: true },
  });
  const team = auction.teams[0]!;
  const player = auction.players[0]!;
  const lot = await prisma.lot.create({
    data: { auctionId: auction.id, playerId: player.id, status: "ACTIVE" },
  });
  await prisma.auction.update({ where: { id: auction.id }, data: { currentLotId: lot.id } });
  await prisma.bid.create({ data: { lotId: lot.id, teamId: team.id, amount: player.basePrice + 100_000 } });

  const sold = auction.players[1]!;
  await prisma.purchase.create({
    data: {
      auctionId: auction.id,
      teamId: team.id,
      playerId: sold.id,
      basePrice: sold.basePrice,
      soldPrice: sold.basePrice,
    },
  });
  await prisma.player.update({ where: { id: sold.id }, data: { status: "SOLD" } });

  if (opts?.extraAuctionPurchase) {
    const other = await prisma.auction.create({
      data: {
        name: "Other",
        code: `O${Date.now().toString(36).slice(-5)}`,
        hostId: host.id,
        status: "LIVE",
        initialPurse: DEFAULT_INITIAL_PURSE,
      },
    });
    const outsider = await prisma.player.create({
      data: {
        auctionId: other.id,
        name: "Outsider",
        role: "raider",
        rating: 99,
        basePrice: 1,
      },
    });
    await prisma.purchase.create({
      data: {
        auctionId: other.id,
        teamId: team.id,
        playerId: outsider.id,
        basePrice: 1,
        soldPrice: 1,
      },
    });
  }

  return { host, guest, auction, lot, player };
}

describe("finalization", () => {
  beforeAll(() => {
    if (!fs.existsSync(dbPath)) {
      execSync("npx prisma db push", { stdio: "inherit" });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a non-host", async () => {
    await reset();
    const { guest, auction } = await seedLiveAuction();
    await expect(endAuction(prisma, auction.id, guest.id)).rejects.toMatchObject({ status: 403 });
  });

  it("is idempotent: double end returns the same snapshot and one row", async () => {
    await reset();
    const { host, auction } = await seedLiveAuction();
    const first = await endAuction(prisma, auction.id, host.id);
    const second = await endAuction(prisma, auction.id, host.id);
    expect(second.id).toBe(first.id);
    expect(second.resultSnapshot).toEqual(first.resultSnapshot);
    expect(await prisma.auctionResult.count({ where: { auctionId: auction.id } })).toBe(1);
  });

  it("ignores tampered client values because the endpoint never reads them", async () => {
    await reset();
    const { host, auction } = await seedLiveAuction({ tamperPurse: true });
    const result = await endAuction(prisma, auction.id, host.id);
    const warnings = result.integrityWarnings as string[];
    expect(warnings.some((w) => w.includes("ledger"))).toBe(true);
    const snapshot = result.resultSnapshot as unknown as AuctionScoreResult;
    expect(snapshot.teams[0]?.remainingPurse).not.toBe(1);
  });

  it("ignores purchases that belong to another auction", async () => {
    await reset();
    const { host, auction } = await seedLiveAuction({ extraAuctionPurchase: true });
    const result = await endAuction(prisma, auction.id, host.id);
    const snapshot = result.resultSnapshot as unknown as AuctionScoreResult;
    const names = snapshot.teams.flatMap((t) => t.purchases.map((p) => p.name));
    expect(names).not.toContain("Outsider");
  });

  it("cancels an active lot without turning unconfirmed bids into purchases", async () => {
    await reset();
    const { host, auction, lot, player } = await seedLiveAuction();
    await endAuction(prisma, auction.id, host.id);
    const closed = await prisma.lot.findUnique({ where: { id: lot.id } });
    expect(closed?.status).toBe("CANCELLED");
    const unsold = await prisma.player.findUnique({ where: { id: player.id } });
    expect(unsold?.status).toBe("UNSOLD");
    expect(await prisma.purchase.count({ where: { playerId: player.id } })).toBe(0);
  });

  it("escapes CSV injection in generated summary/squads", () => {
    const snapshot: AuctionScoreResult = {
      status: "WINNER",
      statusExplanation: "x",
      scoringConfigVersion: "1.0.0",
      teams: [
        {
          teamId: "1",
          teamName: "=HACK",
          logoUrl: null,
          colorPrimary: "#000",
          colorSecondary: "#fff",
          eligible: true,
          ineligibilityReasons: [],
          rank: 1,
          indicative: false,
          categoryScores: { raider: 1, defender: 1, allRounder: 1, balance: 1, purse: 1 },
          weightedCategoryPoints: { raider: 1, defender: 1, allRounder: 1, balance: 1, purse: 1 },
          finalScore: 1,
          playersBought: 1,
          roleCounts: { raider: 1, defender: 0, allRounder: 0 },
          totalSpent: 1,
          remainingPurse: 1,
          totalRatings: 1,
          purchases: [
            {
              playerId: "p",
              name: "+danger",
              role: "raider",
              rating: 80,
              basePrice: 1,
              soldPrice: 1,
            },
          ],
        },
      ],
      eligibleTeamIds: ["1"],
      winnerTeamIds: ["1"],
      awards: {
        bestRaider: null,
        bestDefender: null,
        bestAllRounder: null,
        mostExpensive: null,
        bestValue: null,
      },
      winnerVsRunnerUp: null,
      whyRankedFirst: "x",
    };
    const summary = summaryCsv(snapshot);
    const squads = squadsCsv(snapshot);
    expect(summary).toContain(RESULTS_CSV_NOTE);
    expect(summary).toContain("'=HACK");
    expect(squads).toContain("'+danger");
  });
});

describe("HttpError", () => {
  it("carries status codes", () => {
    const err = new HttpError(403, "nope");
    expect(err.status).toBe(403);
  });
});
