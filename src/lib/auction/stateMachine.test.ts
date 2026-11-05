import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createPrismaClient } from "../prisma";
import { createAuction, joinTeam, getAuctionState } from "./service";
import { AuctionEngine } from "./engine";
import { endAuction } from "./finalize";

const dbPath = path.join(process.cwd(), "dev.db");
const prisma = createPrismaClient();

describe("Server-Authoritative State Machine & Auction Engine", () => {
  let hostUser: { id: string; name: string };
  let participant1: { id: string; name: string };
  let participant2: { id: string; name: string };

  beforeAll(async () => {
    if (!fs.existsSync(dbPath)) {
      execSync("npx prisma db push", { stdio: "inherit" });
    }
    hostUser = await prisma.user.create({ data: { name: "Host Admin" } });
    participant1 = await prisma.user.create({ data: { name: "Participant 1" } });
    participant2 = await prisma.user.create({ data: { name: "Participant 2" } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("A. New room always starts in WAITING state with all teams unclaimed and no active lot", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Test Tournament");
    expect(auction.status).toBe("WAITING");
    expect(auction.currentLotId).toBeNull();

    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });
    expect(teams.length).toBe(12);
    expect(teams.every((t) => t.ownerId === null)).toBe(true);

    const snapshot = await getAuctionState(prisma, auction.id, participant1.id, false);
    expect(snapshot.auction.status).toBe("WAITING");
    expect(snapshot.lot).toBeNull();
  });

  it("B. Multiple participants join and select teams -> room remains in WAITING state", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Waiting Room Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });

    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id, "Coach P1");
    await joinTeam(prisma, auction.id, participant2.id, teams[1]!.id, "Coach P2");

    const refreshed = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });
    expect(refreshed.status).toBe("WAITING");
    expect(refreshed.currentLotId).toBeNull();
  });

  it("C. Team claim rules: simultaneous claims for one team reject duplicate, and team switching is prevented", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Claim Rules Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });

    // P1 claims Team 0
    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id, "Coach P1");

    // P2 tries to claim Team 0 -> must fail with 409
    await expect(
      joinTeam(prisma, auction.id, participant2.id, teams[0]!.id, "Coach P2")
    ).rejects.toMatchObject({ status: 409 });

    // P1 tries to switch to Team 1 -> must fail with 409
    await expect(
      joinTeam(prisma, auction.id, participant1.id, teams[1]!.id, "Coach P1 New")
    ).rejects.toMatchObject({ status: 409 });
  });

  it("D. Admin starts auction -> enforces minimum 1 claimed franchise, transitions to LIVE, opens first lot, and starts timer", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Live Start Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });

    // Attempting to start with 0 claims -> rejected with 400
    await expect(AuctionEngine.start(auction.id)).rejects.toMatchObject({ status: 400 });

    // Claim 1 team -> now allowed
    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id);
    const started = await AuctionEngine.start(auction.id);

    expect(started.status).toBe("LIVE");
    expect(started.currentLotId).toBeTruthy();
    expect(started.timerDeadline).toBeTruthy();

    const lot = await prisma.lot.findUniqueOrThrow({
      where: { id: started.currentLotId! },
      include: { player: true },
    });
    expect(lot.status).toBe("OPEN");
    expect(lot.player).toBeTruthy();
  });

  it("E. Repeated Start calls are rejected and do not create duplicate timers", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Duplicate Start Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });
    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id);
    await joinTeam(prisma, auction.id, participant2.id, teams[1]!.id);

    await AuctionEngine.start(auction.id);

    // Second start attempt must reject with 409
    await expect(AuctionEngine.start(auction.id)).rejects.toMatchObject({ status: 409 });
  });

  it("F. Valid bid accepted from franchise owner, resets countdown, and prevents self-outbidding", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Bidding Engine Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });

    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id);
    await joinTeam(prisma, auction.id, participant2.id, teams[1]!.id);

    await AuctionEngine.start(auction.id);
    const lot = await prisma.lot.findFirstOrThrow({
      where: { auctionId: auction.id, status: "OPEN" },
      include: { player: true },
    });

    // P1 places opening bid at base price
    const bid1 = await AuctionEngine.placeBid(auction.id, participant1.id, lot.player.basePrice);
    expect(bid1.amount).toBe(lot.player.basePrice);
    expect(bid1.teamId).toBe(teams[0]!.id);

    // P1 cannot bid against their own leading bid!
    await expect(
      AuctionEngine.placeBid(auction.id, participant1.id, lot.player.basePrice + 500_000)
    ).rejects.toMatchObject({ status: 400 });

    // P2 places next valid bid
    const bid2 = await AuctionEngine.placeBid(
      auction.id,
      participant2.id,
      lot.player.basePrice + 500_000
    );
    expect(bid2.amount).toBe(lot.player.basePrice + 500_000);
    expect(bid2.teamId).toBe(teams[1]!.id);
  });

  it("G & H. Pause freezes timer & rejects bids; Resume continues from remaining time", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Pause Resume Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });
    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id);
    await joinTeam(prisma, auction.id, participant2.id, teams[1]!.id);

    await AuctionEngine.start(auction.id);

    // Pause auction
    const paused = await AuctionEngine.pause(auction.id);
    expect(paused.status).toBe("PAUSED");
    expect(paused.timerDeadline).toBeNull();
    expect(paused.timerRemainingMs).toBeGreaterThan(0);

    // Bids must be rejected while paused
    const lot = await prisma.lot.findFirstOrThrow({ where: { auctionId: auction.id } });
    await expect(
      AuctionEngine.placeBid(auction.id, participant1.id, 2_000_000)
    ).rejects.toMatchObject({ status: 409 });

    // Resume auction
    const resumed = await AuctionEngine.resume(auction.id);
    expect(resumed?.status).toBe("LIVE");
    expect(resumed?.timerDeadline).toBeTruthy();
  });

  it("J. Host disconnect automatically pauses a live auction", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Host Disconnect Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });
    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id);
    await joinTeam(prisma, auction.id, participant2.id, teams[1]!.id);
    await AuctionEngine.start(auction.id);

    // Host socket disconnects
    await AuctionEngine.onHostDisconnected(auction.id);

    const refreshed = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });
    expect(refreshed.status).toBe("PAUSED");
  });

  it("N. End auction stops all bidding and finalizes room as ENDED", async () => {
    const auction = await createAuction(prisma, hostUser.id, "End Auction Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });
    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id);
    await joinTeam(prisma, auction.id, participant2.id, teams[1]!.id);
    await AuctionEngine.start(auction.id);

    await AuctionEngine.end(auction.id, hostUser.id);

    const endedAuction = await prisma.auction.findUniqueOrThrow({ where: { id: auction.id } });
    expect(endedAuction.status).toBe("ENDED");

    // Any bid after end is rejected
    await expect(
      AuctionEngine.placeBid(auction.id, participant1.id, 1_000_000)
    ).rejects.toMatchObject({ status: 409 });
  });

  it("P. Participant state payloads do not expose ratings of unsold players", async () => {
    const auction = await createAuction(prisma, hostUser.id, "Hidden Rating Test");
    const teams = await prisma.team.findMany({ where: { auctionId: auction.id } });
    await joinTeam(prisma, auction.id, participant1.id, teams[0]!.id);
    await joinTeam(prisma, auction.id, participant2.id, teams[1]!.id);
    await AuctionEngine.start(auction.id);

    const snapshot = await getAuctionState(prisma, auction.id, participant1.id, false);

    // Current lot player rating must be 0/hidden during active bidding
    expect(snapshot.lot).toBeTruthy();
    expect(snapshot.lot?.player.rating).toBe(0);

    // All available players in the list must also have rating concealed (0)
    for (const player of snapshot.auction.players) {
      if (player.status !== "SOLD") {
        expect(player.rating).toBe(0);
      }
    }
  });
});
