import type { PrismaClient } from "@prisma/client";
import { emitToAuction } from "../realtime";
import { HttpError } from "./finalize";
import { auctionCode, buildFictionalPlayers, DEFAULT_INITIAL_PURSE, FICTIONAL_TEAMS } from "./roster";
import { AuctionEngine } from "./engine";

export async function createAuction(
  db: PrismaClient,
  hostId: string,
  name: string,
  options?: { initialPurse?: number; minSquad?: number; maxSquad?: number }
) {
  const purse = options?.initialPurse && options.initialPurse > 0 ? options.initialPurse : DEFAULT_INITIAL_PURSE;
  const minSquad = options?.minSquad && options.minSquad >= 6 ? options.minSquad : 8;
  const maxSquad = options?.maxSquad && options.maxSquad >= minSquad ? options.maxSquad : 18;

  const auction = await db.auction.create({
    data: {
      name: name.trim() || "Pro Kabaddi Style Auction",
      code: auctionCode(),
      hostId,
      hostSecret: crypto.randomUUID(),
      status: "WAITING",
      initialPurse: purse,
      minSquad,
      maxSquad,
      teams: {
        create: FICTIONAL_TEAMS.map((team) => ({
          name: team.name,
          colorPrimary: team.colorPrimary,
          colorSecondary: team.colorSecondary,
          initialPurse: purse,
          currentPurse: purse,
          ownerId: null, // Starts 100% unclaimed
        })),
      },
      players: {
        create: buildFictionalPlayers(),
      },
    },
  });
  return auction;
}

/**
 * Claims a franchise for a participant with atomic server-side enforcement.
 * - Cannot claim an already-claimed franchise.
 * - One participant can only own ONE franchise in this auction.
 * - No switching or abandoning once chosen.
 */
export async function joinTeam(
  db: PrismaClient,
  auctionId: string,
  userId: string,
  teamId: string,
  coachName?: string
) {
  const auction = await db.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new HttpError(404, "Auction not found");
  const status = auction.status as string;
  if (status === "ENDED" || status === "COMPLETED") {
    throw new HttpError(409, "Auction has already concluded");
  }

  await db.$transaction(async (tx) => {
    // 1. Check if user already owns any team in this auction
    const existingClaim = await tx.team.findFirst({
      where: { auctionId, ownerId: userId },
    });

    if (existingClaim) {
      if (existingClaim.id === teamId) {
        // Already owns this team; just allow name update if provided
        if (coachName?.trim()) {
          await tx.user.update({
            where: { id: userId },
            data: { name: coachName.trim().slice(0, 40) },
          });
        }
        return;
      }
      throw new HttpError(
        409,
        `Franchise switching is not permitted. You are already in charge of ${existingClaim.name}.`
      );
    }

    // 2. Find target team
    const targetTeam = await tx.team.findFirst({
      where: { id: teamId, auctionId },
    });
    if (!targetTeam) throw new HttpError(404, "Franchise not found in this auction");

    if (targetTeam.ownerId && targetTeam.ownerId !== userId) {
      throw new HttpError(409, `This franchise is already claimed by another coach.`);
    }

    // 3. Atomically claim franchise and optionally update coach display name
    await tx.team.update({
      where: { id: teamId },
      data: { ownerId: userId },
    });

    if (coachName?.trim()) {
      await tx.user.update({
        where: { id: userId },
        data: { name: coachName.trim().slice(0, 40) },
      });
    }
  });

  emitToAuction(auctionId, "auction:updated", { auctionId });
}

export async function startAuction(db: PrismaClient, auctionId: string, _userId: string) {
  return AuctionEngine.start(auctionId);
}

export async function placeBid(
  _db: PrismaClient,
  auctionId: string,
  userId: string,
  amount: number,
  _preferredTeamId?: string
) {
  return AuctionEngine.placeBid(auctionId, userId, amount);
}

export async function markSold(db: PrismaClient, auctionId: string, userId: string) {
  const auction = await db.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new HttpError(404, "Auction not found");
  if (auction.hostId !== userId) throw new HttpError(403, "Only the host can mark SOLD");
  return AuctionEngine.resume(auctionId);
}

export async function markUnsold(db: PrismaClient, auctionId: string, userId: string) {
  const auction = await db.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new HttpError(404, "Auction not found");
  if (auction.hostId !== userId) throw new HttpError(403, "Only the host can mark UNSOLD");
  return AuctionEngine.resume(auctionId);
}

/**
 * Returns the authoritative room snapshot with hidden rating redactions.
 * Active and available players have ratings concealed (null) until officially SOLD!
 */
export async function getAuctionState(
  db: PrismaClient,
  auctionId: string,
  _userId?: string,
  isHost: boolean = false
) {
  const auction = await db.auction.findUnique({
    where: { id: auctionId },
    include: {
      host: { select: { id: true, name: true } },
      teams: {
        include: {
          owner: { select: { id: true, name: true } },
          purchases: {
            include: {
              player: {
                select: { id: true, name: true, role: true, rating: true, basePrice: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },
      players: {
        select: {
          id: true,
          name: true,
          role: true,
          basePrice: true,
          status: true,
          rating: true, // will be sanitized below
        },
        orderBy: { name: "asc" },
      },
      result: true,
    },
  });

  if (!auction) throw new HttpError(404, "Auction not found");

  const lot = auction.currentLotId
    ? await db.lot.findUnique({
        where: { id: auction.currentLotId },
        include: {
          player: {
            select: {
              id: true,
              name: true,
              role: true,
              basePrice: true,
              status: true,
              rating: true, // will be sanitized below
            },
          },
          bids: {
            include: { team: { select: { id: true, name: true, colorPrimary: true } } },
            orderBy: { amount: "desc" },
          },
        },
      })
    : null;

  // HIDDEN RATINGS ENFORCEMENT:
  // Ratings must NOT be exposed through APIs or client state while lot is pending or open.
  // Only officially SOLD players retain their ratings.
  const sanitizedPlayers = auction.players.map((p) => {
    if (p.status === "SOLD") {
      return p;
    }
    // Conceal rating for all available/unsold players
    return { ...p, rating: 0 };
  });

  let sanitizedLot = null;
  if (lot) {
    const isLotSold = (lot.status as string) === "SOLD";
    sanitizedLot = {
      ...lot,
      player: {
        ...lot.player,
        rating: isLotSold ? lot.player.rating : 0, // concealed during active/open bidding
      },
    };
  }

  // Timer state from authoritative server engine
  const timer = AuctionEngine.getTimerState(auctionId);

  // Strip hostSecret from public snapshot
  const { hostSecret: _, ...safeAuction } = auction;

  return {
    auction: {
      ...safeAuction,
      players: sanitizedPlayers,
    },
    lot: sanitizedLot,
    timer,
    version: auction.version,
    isHost,
  };
}
