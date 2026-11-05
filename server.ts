import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";
import { setIO } from "./src/lib/realtime";
import { AuctionEngine } from "./src/lib/auction/engine";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Restore any LIVE auctions as PAUSED upon server restart
  void AuctionEngine.onServerStart();

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    void handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  setIO(io);

  // Track host sockets per auction
  const hostSockets = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    let joinedAuctionId: string | null = null;
    let isSocketHost = false;

    socket.on("join", (data: string | { auctionId: string; isHost?: boolean }) => {
      const auctionId = typeof data === "string" ? data : data?.auctionId;
      const isHost = typeof data === "object" ? Boolean(data.isHost) : false;

      if (typeof auctionId === "string" && auctionId.length > 0) {
        joinedAuctionId = auctionId;
        isSocketHost = isHost;
        void socket.join(`auction:${auctionId}`);

        if (isHost) {
          let hostSet = hostSockets.get(auctionId);
          if (!hostSet) {
            hostSet = new Set();
            hostSockets.set(auctionId, hostSet);
          }
          hostSet.add(socket.id);
        }
      }
    });

    socket.on("disconnect", () => {
      if (joinedAuctionId && isSocketHost) {
        const hostSet = hostSockets.get(joinedAuctionId);
        if (hostSet) {
          hostSet.delete(socket.id);
          // Only pause if ALL host connections for this auction are lost
          if (hostSet.size === 0) {
            hostSockets.delete(joinedAuctionId);
            void AuctionEngine.onHostDisconnected(joinedAuctionId);
          }
        }
      }
    });
  });

  const server = httpServer.listen(port, hostname, () => {
    console.log(`PK Auction ready on http://0.0.0.0:${port}`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}. Gracefully shutting down...`);
    io.close(() => {
      console.log("[Server] Socket.IO server closed.");
      server.close(() => {
        console.log("[Server] HTTP server closed.");
        process.exit(0);
      });
    });
    // Force shutdown after 10 seconds if hanging
    setTimeout(() => {
      console.error("[Server] Forced shutdown after timeout.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
});
