import { PrismaClient } from "@prisma/client";
import fs from "node:fs";

const prisma = new PrismaClient();

async function main() {
  const auctions = await prisma.auction.findMany({
    select: { id: true, code: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  console.log("Total Auctions in DB:", auctions.length);

  for (const a of auctions) {
    const playerCount = await prisma.player.count({ where: { auctionId: a.id } });
    console.log(`- Auction ${a.code} ("${a.name}"): ${playerCount} players`);
  }

  const allPlayers = await prisma.player.findMany({
    select: { id: true, name: true, role: true, basePrice: true, rating: true, status: true, auctionId: true },
  });
  console.log("\nTotal player rows in DB across all rooms:", allPlayers.length);

  // Group by distinct player names
  const nameMap = new Map();
  for (const p of allPlayers) {
    if (!nameMap.has(p.name)) {
      nameMap.set(p.name, []);
    }
    nameMap.get(p.name).push(p);
  }

  console.log("Total unique player profiles/names in DB:", nameMap.size);

  // Check against manifest and playerImages
  const manifestPath = "./public/players/manifest.json";
  let manifest = [];
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  }
  console.log("Entries in public/players/manifest.json:", manifest.length);

  // Let's print out all unique players in the roster
  console.log("\n--- Full Roster of Unique Player Names ---");
  const sortedNames = Array.from(nameMap.keys()).sort();
  sortedNames.forEach((n, idx) => {
    console.log(`${idx + 1}. ${n}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
