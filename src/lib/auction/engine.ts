import { PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { emitToAuction } from "../realtime";
import { endAuction, HttpError } from "./finalize";

export const LOT_TIMER_DURATION_SEC = 15;
export const MIN_SQUAD_SIZE = 12;
export const MAX_SQUAD_SIZE = 18;
export const MIN_RESERVE_PRICE_PER_SLOT = 1_000_000; // 10 Lakhs reserve per remaining mandatory slot

export function calculateNextValidBid(currentAmount: number, basePrice: number): number {
  if (currentAmount <= 0) return basePrice;
  if (currentAmount < 10_000_000) {
    return currentAmount + 500_000; // 5 Lakhs increment below 1 Crore
  } else if (currentAmount < 20_000_000) {
    return currentAmount + 1_000_000; // 10 Lakhs increment between 1 - 2 Crore
  } else {
    return currentAmount + 2_000_000; // 20 Lakhs increment above 2 Crore
  }
}

interface RoomController {
  auctionId: string;
  timer: NodeJS.Timeout | null;
  deadline: number | null; // epoch ms
  remainingMs: number;
  lotId: string | null;
  timerDurationSec: number;
}

const globalForEngine = globalThis as unknown as {
  auctionEngineControllers?: Map<string, RoomController>;
};

const controllers = globalForEngine.auctionEngineControllers ?? new Map<string, RoomController>();
if (process.env.NODE_ENV !== "production") {
  globalForEngine.auctionEngineControllers = controllers;
}

function getController(auctionId: string): RoomController {
  let ctrl = controllers.get(auctionId);
  if (!ctrl) {
    ctrl = {
      auctionId,
      timer: null,
      deadline: null,
      remainingMs: LOT_TIMER_DURATION_SEC * 1000,
      lotId: null,
      timerDurationSec: LOT_TIMER_DURATION_SEC,
    };
    controllers.set(auctionId, ctrl);
  }
  return ctrl;
}

function clearRoomTimer(auctionId: string) {
  const ctrl = controllers.get(auctionId);
  if (ctrl && ctrl.timer) {
    clearTimeout(ctrl.timer);
    ctrl.timer = null;
  }
}

/**
 * Starts the server-authoritative countdown timer for the current lot.
 */
function scheduleLotDeadline(auctionId: string, lotId: string, durationMs: number) {
  const ctrl = getController(auctionId);
  clearRoomTimer(auctionId);

  const deadline = Date.now() + durationMs;
  ctrl.deadline = deadline;
  ctrl.remainingMs = durationMs;
  ctrl.lotId = lotId;

  ctrl.timer = setTimeout(() => {
    void handleTimerExpiration(auctionId, lotId);
  }, durationMs);

  return deadline;
}

/**
 * Atomic handler called when the server timer expires for a lot.
 */
async function handleTimerExpiration(auctionId: string, lotId: string) {
  const ctrl = getController(auctionId);
  ctrl.timer = null;
  ctrl.deadline = null;

  try {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        lots: {
          where: { id: lotId },
          include: {
            player: true,
            bids: { orderBy: { amount: "desc" }, include: { team: true } },
          },
        },
      },
    });

    if (!auction) return;
    const status = auction.status as string;
    if (status !== "LIVE" || auction.currentLotId !== lotId) {
      return; // Room was paused, ended, or lot changed
    }

    const lot = auction.lots[0];
    if (!lot || ((lot.status as string) !== "OPEN" && (lot.status as string) !== "ACTIVE")) {
      return;
    }

    const highestBid = lot.bids[0];

    if (highestBid) {
      // Finalize as SOLD
      await prisma.$transaction(async (tx) => {
        await tx.purchase.create({
          data: {
            auctionId,
            teamId: highestBid.teamId,
            playerId: lot.playerId,
            lotId: lot.id,
            basePrice: lot.player.basePrice,
            soldPrice: highestBid.amount,
          },
        });
        await tx.team.update({
          where: { id: highestBid.teamId },
          data: { currentPurse: { decrement: highestBid.amount } },
        });
        await tx.player.update({
          where: { id: lot.playerId },
          data: { status: "SOLD" },
        });
        await tx.lot.update({
          where: { id: lot.id },
          data: { status: "SOLD", endedAt: new Date() },
        });
      });

      emitToAuction(auctionId, "lot:sold", {
        auctionId,
        lotId: lot.id,
        playerName: lot.player.name,
        winningTeam: highestBid.team.name,
        winningTeamColor: highestBid.team.colorPrimary,
        amount: highestBid.amount,
        rating: lot.player.rating, // rating revealed now that player is SOLD!
      });
    } else {
      // Finalize as UNSOLD
      await prisma.$transaction(async (tx) => {
        await tx.player.update({
          where: { id: lot.playerId },
          data: { status: "UNSOLD" },
        });
        await tx.lot.update({
          where: { id: lot.id },
          data: { status: "UNSOLD", endedAt: new Date() },
        });
      });

      emitToAuction(auctionId, "lot:unsold", {
        auctionId,
        lotId: lot.id,
        playerName: lot.player.name,
      });
    }

    // Open next lot or end auction
    await openNextLotOrEnd(auctionId);
  } catch (err) {
    console.error(`[Engine] Error in handleTimerExpiration for ${auctionId}:`, err);
  }
}

/**
 * Opens next available player lot or automatically finalizes the tournament.
 */
async function openNextLotOrEnd(auctionId: string) {
  const availablePlayers = await prisma.player.findMany({
    where: { auctionId, status: "AVAILABLE" },
  });

  if (availablePlayers.length === 0) {
    // All players auctioned, end auction
    clearRoomTimer(auctionId);
    await endAuction(prisma, auctionId);
    await prisma.auction.update({
      where: { id: auctionId },
      data: {
        version: { increment: 1 },
        currentLotId: null,
        timerDeadline: null,
        timerRemainingMs: null,
      },
    });
    emitToAuction(auctionId, "auction:finalized", { auctionId });
    return;
  }

  // Shuffle pick next player
  const randomIndex = Math.floor(Math.random() * availablePlayers.length);
  const nextPlayer = availablePlayers[randomIndex]!;

  const nextLot = await prisma.lot.create({
    data: {
      auctionId,
      playerId: nextPlayer.id,
      status: "OPEN",
    },
  });

  const ctrl = getController(auctionId);
  const durationMs = ctrl.timerDurationSec * 1000;
  const deadlineEpoch = scheduleLotDeadline(auctionId, nextLot.id, durationMs);

  await prisma.auction.update({
    where: { id: auctionId },
    data: {
      currentLotId: nextLot.id,
      timerDeadline: new Date(deadlineEpoch),
      timerRemainingMs: null,
      version: { increment: 1 },
    },
  });

  emitToAuction(auctionId, "auction:updated", { auctionId });
}

/**
 * Server Auction Engine Actions
 */
export const AuctionEngine = {
  getTimerState(auctionId: string) {
    const ctrl = controllers.get(auctionId);
    if (!ctrl) {
      return { deadline: null, remainingMs: LOT_TIMER_DURATION_SEC * 1000, isRunning: false };
    }
    return {
      deadline: ctrl.deadline,
      remainingMs: ctrl.deadline ? Math.max(0, ctrl.deadline - Date.now()) : ctrl.remainingMs,
      isRunning: Boolean(ctrl.timer && ctrl.deadline),
      timerDuration: ctrl.timerDurationSec,
    };
  },

  setTimerDuration(auctionId: string, seconds: number) {
    const sec = Math.max(3, Math.min(60, Math.round(seconds)));
    const ctrl = getController(auctionId);
    ctrl.timerDurationSec = sec;
    ctrl.remainingMs = sec * 1000;
    if (ctrl.deadline && ctrl.lotId) {
      scheduleLotDeadline(auctionId, ctrl.lotId, sec * 1000);
    }
    emitToAuction(auctionId, "auction:timer-updated", { timerDuration: sec });
    return sec;
  },

  /**
   * Start auction: valid ONLY from WAITING
   * Requires at least 2 claimed franchises unless skipMinClaimCheck is true.
   */
  async start(auctionId: string, options?: { skipMinClaimCheck?: boolean }) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new HttpError(404, "Auction not found");

    const status = auction.status as string;
    if (status !== "WAITING" && status !== "LOBBY") {
      throw new HttpError(409, `Auction cannot be started from state ${status}`);
    }

    if (!options?.skipMinClaimCheck) {
      const claimedTeamsCount = await prisma.team.count({
        where: { auctionId, ownerId: { not: null } },
      });
      if (claimedTeamsCount < 1) {
        throw new HttpError(
          400,
          `At least 1 franchise must be claimed by a coach before starting the auction.`
        );
      }
    }

    clearRoomTimer(auctionId);

    // Pick first available player in random shuffled order
    const availablePlayers = await prisma.player.findMany({
      where: { auctionId, status: "AVAILABLE" },
    });
    if (availablePlayers.length === 0) throw new HttpError(409, "No available players in this auction");

    const randomIndex = Math.floor(Math.random() * availablePlayers.length);
    const firstPlayer = availablePlayers[randomIndex]!;

    const lot = await prisma.lot.create({
      data: {
        auctionId,
        playerId: firstPlayer.id,
        status: "OPEN",
      },
    });

    const ctrl = getController(auctionId);
    const durationMs = ctrl.timerDurationSec * 1000;
    const deadlineEpoch = scheduleLotDeadline(auctionId, lot.id, durationMs);

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: "LIVE",
        currentLotId: lot.id,
        timerDeadline: new Date(deadlineEpoch),
        timerRemainingMs: null,
        version: { increment: 1 },
      },
    });

    emitToAuction(auctionId, "auction:updated", { auctionId });
    return updated;
  },

  /**
   * Pause auction: valid ONLY from LIVE
   */
  async pause(auctionId: string, reason?: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new HttpError(404, "Auction not found");

    const status = auction.status as string;
    if (status === "PAUSED") {
      return auction; // Idempotent
    }
    if (status !== "LIVE") {
      throw new HttpError(409, `Auction cannot be paused from state ${status}`);
    }

    const ctrl = getController(auctionId);
    let remainingMs = LOT_TIMER_DURATION_SEC * 1000;
    if (ctrl.deadline) {
      remainingMs = Math.max(1000, ctrl.deadline - Date.now());
    } else if (auction.timerRemainingMs) {
      remainingMs = auction.timerRemainingMs;
    }

    clearRoomTimer(auctionId);
    ctrl.deadline = null;
    ctrl.remainingMs = remainingMs;

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: "PAUSED",
        timerDeadline: null,
        timerRemainingMs: remainingMs,
        version: { increment: 1 },
      },
    });

    emitToAuction(auctionId, "auction:paused", { auctionId, reason: reason ?? "Admin paused the auction" });
    emitToAuction(auctionId, "auction:updated", { auctionId });
    return updated;
  },

  /**
   * Resume auction: valid ONLY from PAUSED
   */
  async resume(auctionId: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new HttpError(404, "Auction not found");

    const status = auction.status as string;
    if (status === "LIVE") {
      return auction; // Idempotent
    }
    if (status !== "PAUSED") {
      throw new HttpError(409, `Auction cannot be resumed from state ${status}`);
    }

    if (!auction.currentLotId) {
      await openNextLotOrEnd(auctionId);
      return prisma.auction.findUnique({ where: { id: auctionId } });
    }

    const remainingMs = auction.timerRemainingMs && auction.timerRemainingMs > 1000
      ? auction.timerRemainingMs
      : LOT_TIMER_DURATION_SEC * 1000;

    const deadlineEpoch = scheduleLotDeadline(auctionId, auction.currentLotId, remainingMs);

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: "LIVE",
        timerDeadline: new Date(deadlineEpoch),
        timerRemainingMs: null,
        version: { increment: 1 },
      },
    });

    emitToAuction(auctionId, "auction:resumed", { auctionId });
    emitToAuction(auctionId, "auction:updated", { auctionId });
    return updated;
  },

  /**
   * End auction: valid from LIVE or PAUSED
   */
  async end(auctionId: string, hostId?: string) {
    clearRoomTimer(auctionId);
    const result = await endAuction(prisma, auctionId, hostId);
    emitToAuction(auctionId, "auction:finalized", { auctionId });
    return result;
  },

  /**
   * Reset auction back to WAITING state (explicit Host action)
   */
  async reset(auctionId: string) {
    clearRoomTimer(auctionId);

    await prisma.$transaction(async (tx) => {
      await tx.bid.deleteMany({ where: { lot: { auctionId } } });
      await tx.purchase.deleteMany({ where: { auctionId } });
      await tx.lot.deleteMany({ where: { auctionId } });
      await tx.auctionResult.deleteMany({ where: { auctionId } });
      await tx.player.updateMany({
        where: { auctionId },
        data: { status: "AVAILABLE" },
      });
      const auction = await tx.auction.findUniqueOrThrow({ where: { id: auctionId } });
      await tx.team.updateMany({
        where: { auctionId },
        data: { currentPurse: auction.initialPurse },
      });
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          status: "WAITING",
          currentLotId: null,
          timerDeadline: null,
          timerRemainingMs: null,
          version: { increment: 1 },
        },
      });
    });

    emitToAuction(auctionId, "auction:updated", { auctionId });
  },

  /**
   * Validate and accept a bid from an authenticated participant.
   */
  async placeBid(auctionId: string, userId: string, amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new HttpError(400, "Bid amount must be a positive integer");
    }

    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        teams: {
          include: { purchases: true },
        },
      },
    });

    if (!auction) throw new HttpError(404, "Auction not found");
    const status = auction.status as string;
    if (status !== "LIVE" || !auction.currentLotId) {
      throw new HttpError(409, "Bidding is only allowed when auction is LIVE with an open lot");
    }

    const ctrl = getController(auctionId);
    if (ctrl.deadline && Date.now() > ctrl.deadline + 500) {
      throw new HttpError(409, "Bidding time has expired for this player");
    }

    // Verify user owns a franchise in this room
    const team = auction.teams.find((t) => t.ownerId === userId);
    if (!team) {
      throw new HttpError(403, "You must claim an available franchise before placing a bid");
    }

    // Fetch lot with bids
    const lot = await prisma.lot.findUnique({
      where: { id: auction.currentLotId },
      include: { bids: { orderBy: { amount: "desc" } }, player: true },
    });

    if (!lot || ((lot.status as string) !== "OPEN" && (lot.status as string) !== "ACTIVE")) {
      throw new HttpError(409, "Current lot is not open for bidding");
    }

    const currentHighestBid = lot.bids[0];

    // Rule: Cannot bid against your own currently leading bid
    if (currentHighestBid && currentHighestBid.teamId === team.id) {
      throw new HttpError(400, `Your franchise (${team.name}) already holds the leading bid!`);
    }

    // Rule: Squad maximum check (respects 10, 14, or 18 players limit chosen on creation)
    const roomMaxSquad = auction.maxSquad || MAX_SQUAD_SIZE;
    const roomMinSquad = auction.minSquad || MIN_SQUAD_SIZE;

    if (team.purchases.length >= roomMaxSquad) {
      throw new HttpError(400, `Squad is full! Maximum squad size is ${roomMaxSquad} players.`);
    }

    // Rule: Validate minimum increment slab
    const currentPrice = currentHighestBid ? currentHighestBid.amount : 0;
    const minNextAmount = calculateNextValidBid(currentPrice, lot.player.basePrice);

    if (amount < minNextAmount) {
      throw new HttpError(400, `Minimum next valid bid is ₹${minNextAmount.toLocaleString("en-IN")}`);
    }

    // Rule: Purse check
    if (amount > team.currentPurse) {
      throw new HttpError(400, `Bid exceeds franchise remaining purse (₹${team.currentPurse.toLocaleString("en-IN")})`);
    }

    // Rule: Reserve budget for remaining minimum squad slots
    // If team has bought P players, buying this player makes it P + 1.
    const squadAfterPurchase = team.purchases.length + 1;
    const slotsNeededForMinSquad = Math.max(0, roomMinSquad - squadAfterPurchase);
    const requiredReserve = slotsNeededForMinSlots(slotsNeededForMinSquad);
    const purseAfterBid = team.currentPurse - amount;

    if (purseAfterBid < requiredReserve) {
      throw new HttpError(
        400,
        `Cannot bid ₹${amount.toLocaleString("en-IN")}. You must reserve at least ₹${requiredReserve.toLocaleString(
          "en-IN"
        )} to fill the remaining ${slotsNeededForMinSquad} slots to meet the minimum squad of ${roomMinSquad}.`
      );
    }

    // Atomic bid insertion & timer reset
    const newBid = await prisma.bid.create({
      data: {
        lotId: lot.id,
        teamId: team.id,
        amount,
      },
      include: { team: true },
    });

    // Reset countdown deadline to full duration
    const durationMs = ctrl.timerDurationSec * 1000;
    const newDeadline = scheduleLotDeadline(auctionId, lot.id, durationMs);

    await prisma.auction.update({
      where: { id: auctionId },
      data: {
        timerDeadline: new Date(newDeadline),
        timerRemainingMs: null,
        version: { increment: 1 },
      },
    });

    emitToAuction(auctionId, "bid:placed", {
      auctionId,
      bid: {
        id: newBid.id,
        amount: newBid.amount,
        teamId: team.id,
        teamName: team.name,
        teamColor: team.colorPrimary,
      },
      deadline: newDeadline,
    });

    emitToAuction(auctionId, "auction:updated", { auctionId });

    return newBid;
  },

  /**
   * Called on server startup to ensure no orphaned LIVE auctions run automatically.
   */
  async onServerStart() {
    try {
      const liveAuctions = await prisma.auction.findMany({
        where: { status: "LIVE" },
      });
      for (const a of liveAuctions) {
        await prisma.auction.update({
          where: { id: a.id },
          data: {
            status: "PAUSED",
            timerDeadline: null,
            timerRemainingMs: LOT_TIMER_DURATION_SEC * 1000,
            version: { increment: 1 },
          },
        });
        console.log(`[Engine] Restored auction ${a.id} as PAUSED following server restart.`);
      }
    } catch (err) {
      console.error("[Engine] Error during onServerStart restore:", err);
    }
  },

  /**
   * Called when host socket disconnects.
   */
  async onHostDisconnected(auctionId: string) {
    try {
      const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
      if (auction && (auction.status as string) === "LIVE") {
        await this.pause(auctionId, "Host disconnected from session. Auction paused.");
        console.log(`[Engine] Auction ${auctionId} automatically paused because Host disconnected.`);
      }
    } catch (err) {
      console.error("[Engine] Error in onHostDisconnected:", err);
    }
  },
};

function slotsNeededForMinSlots(slots: number): number {
  return slots * MIN_RESERVE_PRICE_PER_SLOT;
}
