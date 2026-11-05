import { createPrismaClient } from "../src/lib/prisma";
import { buildFictionalPlayers, DEFAULT_INITIAL_PURSE, FICTIONAL_TEAMS } from "../src/lib/auction/roster";
import { endAuction } from "../src/lib/auction/finalize";

const prisma = createPrismaClient();

async function main() {
  console.log("🌱 Seeding Real Pro Kabaddi League Auction & Superstars...");

  // Clean old DB
  await prisma.auctionResult.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.lot.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.auction.deleteMany();
  await prisma.user.deleteMany();

  // Create Auctioneer Host
  const host = await prisma.user.create({ data: { name: "Auctioneer Host" } });

  const allPlayers = buildFictionalPlayers();

  // 1. Create Auction 1: WAITING AUCTION (All 12 teams initially FREE for players to choose)
  const liveAuction = await prisma.auction.create({
    data: {
      name: "Pro Kabaddi Season 11 Auction",
      code: "PKLLIVE",
      hostId: host.id,
      status: "WAITING",
      initialPurse: DEFAULT_INITIAL_PURSE,
      teams: {
        create: FICTIONAL_TEAMS.map((team) => ({
          name: team.name,
          colorPrimary: team.colorPrimary,
          colorSecondary: team.colorSecondary,
          initialPurse: DEFAULT_INITIAL_PURSE,
          currentPurse: DEFAULT_INITIAL_PURSE,
          ownerId: null, // 100% UNCLAIMED - ready for user and friends to choose!
        })),
      },
      players: {
        create: allPlayers,
      },
    },
    include: { teams: true, players: true },
  });

  console.log(`✅ WAITING Auction Ready: http://localhost:3000/auction/${liveAuction.id} (Code: ${liveAuction.code})`);

  // 2. Create Auction 2: COMPLETED TOURNAMENT with Verified Final Results Dashboard
  const resultsAuction = await prisma.auction.create({
    data: {
      name: "Pro Kabaddi Grand Championship",
      code: "PKB2026",
      hostId: host.id,
      status: "LIVE",
      initialPurse: DEFAULT_INITIAL_PURSE,
      teams: {
        create: FICTIONAL_TEAMS.slice(0, 8).map((team, idx) => ({
          name: team.name,
          colorPrimary: team.colorPrimary,
          colorSecondary: team.colorSecondary,
          initialPurse: DEFAULT_INITIAL_PURSE,
          currentPurse: DEFAULT_INITIAL_PURSE,
          ownerId: null,
        })),
      },
      players: {
        create: allPlayers,
      },
    },
    include: { teams: true, players: true },
  });

  const dbRaiders = resultsAuction.players.filter((p) => p.role === "raider");
  const dbDefenders = resultsAuction.players.filter((p) => p.role === "defender");
  const dbAllRounders = resultsAuction.players.filter((p) => p.role === "allRounder");

  let rCursor = 0;
  let dCursor = 0;
  let aCursor = 0;

  for (let tIdx = 0; tIdx < resultsAuction.teams.length; tIdx++) {
    const team = resultsAuction.teams[tIdx]!;
    const purchasesToMake = [];

    // Simulate balanced real squads
    let numRaiders = 5;
    let numDefenders = 6;
    let numAllRounders = 3;

    if (tIdx === 4) {
      numRaiders = 4;
      numDefenders = 3;
      numAllRounders = 0; // Incomplete squad (size 7)
    } else if (tIdx === 6) {
      numRaiders = 6;
      numDefenders = 6;
      numAllRounders = 0; // Missing all-rounders
    }

    const teamRoster = [
      ...dbRaiders.slice(rCursor, rCursor + numRaiders),
      ...dbDefenders.slice(dCursor, dCursor + numDefenders),
      ...dbAllRounders.slice(aCursor, aCursor + numAllRounders),
    ];
    rCursor += numRaiders;
    dCursor += numDefenders;
    aCursor += numAllRounders;

    for (let pIdx = 0; pIdx < teamRoster.length; pIdx++) {
      const player = teamRoster[pIdx]!;
      let soldPrice = player.basePrice + ((pIdx + 1) * 750_000);

      // Over budget test for team 5
      if (tIdx === 5 && pIdx === 0) {
        soldPrice = 105_000_000;
      }

      purchasesToMake.push({
        auctionId: resultsAuction.id,
        teamId: team.id,
        playerId: player.id,
        basePrice: player.basePrice,
        soldPrice,
      });
    }

    for (const p of purchasesToMake) {
      await prisma.purchase.create({ data: p });
      await prisma.player.update({ where: { id: p.playerId }, data: { status: "SOLD" } });
    }

    const totalSpent = purchasesToMake.reduce((sum, p) => sum + p.soldPrice, 0);
    await prisma.team.update({
      where: { id: team.id },
      data: { currentPurse: team.initialPurse - totalSpent },
    });
  }

  const finalSnapshot = await endAuction(prisma, resultsAuction.id, host.id);
  console.log(`✅ COMPLETED Results Ready: http://localhost:3000/auction/${resultsAuction.id}/results (Status: ${finalSnapshot.status})`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
