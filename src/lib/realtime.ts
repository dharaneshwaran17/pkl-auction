import type { Server as IOServer } from "socket.io";

const g = globalThis as unknown as { io?: IOServer };

export function setIO(io: IOServer) {
  g.io = io;
}

export function emitToAuction(auctionId: string, event: string, payload: unknown) {
  g.io?.to(`auction:${auctionId}`).emit(event, payload);
}
