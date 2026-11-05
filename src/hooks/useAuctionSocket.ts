"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

export function useAuctionSocket(
  auctionId: string,
  isHost: boolean,
  onEvent: (event: string, payload?: unknown) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!auctionId) return;

    // Connect to current origin with /socket.io path (works on LAN, localhost, and tunnels)
    const socket: Socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("join", { auctionId, isHost });
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
}
