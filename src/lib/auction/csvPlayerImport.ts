import { PrismaClient, PlayerRole } from "@prisma/client";
import { HttpError } from "./finalize";

export interface CsvPlayerRow {
  name: string;
  role: PlayerRole;
  basePrice: number;
  rating: number;
  country?: string;
  category?: string;
}

export function parsePlayerCsv(csvText: string): CsvPlayerRow[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) {
    throw new HttpError(400, "CSV must contain a header row and at least one player record.");
  }

  const header = lines[0]!.toLowerCase().split(",").map((c) => c.trim());
  const nameIdx = header.indexOf("name");
  const roleIdx = header.indexOf("role");
  const basePriceIdx = header.indexOf("baseprice");
  const ratingIdx = header.indexOf("rating");

  if (nameIdx === -1 || roleIdx === -1 || basePriceIdx === -1 || ratingIdx === -1) {
    throw new HttpError(
      400,
      "CSV header must contain 'name', 'role', 'basePrice', and 'rating' columns."
    );
  }

  const countryIdx = header.indexOf("country");
  const categoryIdx = header.indexOf("category");

  const players: CsvPlayerRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",").map((c) => c.trim());
    const name = cols[nameIdx];
    const rawRole = cols[roleIdx]?.toLowerCase();
    const rawPrice = cols[basePriceIdx];
    const rawRating = cols[ratingIdx];

    if (!name || !rawRole || !rawPrice || !rawRating) continue;

    let role: PlayerRole = "raider";
    if (rawRole === "defender") role = "defender";
    else if (rawRole === "allrounder" || rawRole === "all-rounder" || rawRole === "all_rounder") {
      role = "allRounder";
    }

    const basePrice = parseInt(rawPrice, 10);
    const rating = Math.min(100, Math.max(50, parseInt(rawRating, 10)));

    if (isNaN(basePrice) || basePrice <= 0 || isNaN(rating)) continue;

    players.push({
      name,
      role,
      basePrice,
      rating,
      country: countryIdx !== -1 ? cols[countryIdx] : undefined,
      category: categoryIdx !== -1 ? cols[categoryIdx] : undefined,
    });
  }

  if (players.length === 0) {
    throw new HttpError(400, "No valid player rows found in CSV.");
  }

  return players;
}

export async function importPlayersToAuction(
  db: PrismaClient,
  auctionId: string,
  csvText: string
) {
  const auction = await db.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new HttpError(404, "Auction not found");
  if ((auction.status as string) !== "WAITING") {
    throw new HttpError(409, "Players can only be imported while auction is in WAITING state.");
  }

  const playerRows = parsePlayerCsv(csvText);

  // Add players to auction
  const created = await db.$transaction(
    playerRows.map((p) =>
      db.player.create({
        data: {
          auctionId,
          name: p.name,
          role: p.role,
          basePrice: p.basePrice,
          rating: p.rating,
          status: "AVAILABLE",
        },
      })
    )
  );

  return created;
}
