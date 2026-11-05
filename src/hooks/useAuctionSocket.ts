"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type SocketConnectionState = "connected" | "connecting" | "reconnecting" | "disconnected";

export function useAuctionSocket(
  auctionId: string,
  isHost: boolean,
  onEvent: (event: string, payload?: unknown) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const [connectionState, setConnectionState] = useState<SocketConnectionState>("connecting");

  useEffect(() => {
    if (!auctionId) return;

    // Connect to current origin with /socket.io path (works on LAN, localhost, and tunnels)
    const socket: Socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("join", { auctionId, isHost });
    });

    socket.on("connecting", () => {
      setConnectionState("connecting");
    });

    socket.on("reconnect_attempt", () => {
      setConnectionState("reconnecting");
    });

    socket.on("reconnect", () => {
      setConnectionState("connected");
      socket.emit("join", { auctionId, isHost });
      // Fetch fresh state on reconnect to sync state seamlessly
      onEventRef.current("auction:updated", { auctionId });
    });

    socket.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        socket.connect();
      }
      setConnectionState("disconnected");
    });

    socket.on("connect_error", () => {
      setConnectionState("reconnecting");
    });

    const handle = (eventName: string) => (payload?: unknown) => {
      onEventRef.current(eventName, payload);
    };

    socket.on("auction:updated", handle("auction:updated"));
    socket.on("auction:paused", handle("auction:paused"));
    socket.on("auction:resumed", handle("auction:resumed"));
    socket.on("auction:finalized", handle("auction:finalized"));
    socket.on("bid:placed", handle("bid:placed"));
    socket.on("lot:sold", handle("lot:sold"));
    socket.on("lot:unsold", handle("lot:unsold"));

    return () => {
      socket.off("auction:updated");
      socket.off("auction:paused");
      socket.off("auction:resumed");
      socket.off("auction:finalized");
      socket.off("bid:placed");
      socket.off("lot:sold");
      socket.off("lot:unsold");
      socket.disconnect();
    };
  }, [auctionId, isHost]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    isReconnecting: connectionState === "reconnecting",
  };
}
