"use client";

import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { formatPurse } from "@/lib/money";
import { useAuctionSocket } from "@/hooks/useAuctionSocket";
import { PlayerCardPhoto } from "./PlayerCardPhoto";
import { PlayerAvatar } from "./PlayerAvatar";
import { getPlayerDetails } from "@/lib/auction/playerStats";
import { MegaAuctionRosterModal } from "./MegaAuctionRosterModal";
import { RoomSettingsModal } from "./RoomSettingsModal";
import { TeamSelectionModal } from "./TeamSelectionModal";
import { playBidChime, playGavelHammer, playRefereeWhistle } from "@/lib/auction/soundEffects";

export type AuctionUser = { id: string; name: string };

export type AuctionTeam = {
  id: string;
  name: string;
  logoUrl?: string | null;
  colorPrimary: string;
  colorSecondary: string;
  initialPurse: number;
  currentPurse: number;
  ownerId?: string | null;
  owner?: AuctionUser | null;
  purchases: Array<{
    id: string;
    soldPrice: number;
    basePrice: number;
    player: {
      id: string;
      name: string;
      role: "raider" | "defender" | "allRounder";
      rating: number;
    };
  }>;
};

export type AuctionPlayer = {
  id: string;
  name: string;
  role: "raider" | "defender" | "allRounder";
  rating: number;
  basePrice: number;
  status: "AVAILABLE" | "SOLD" | "UNSOLD";
};

export type AuctionLot = {
  id: string;
  status: "PENDING" | "OPEN" | "ACTIVE" | "SOLD" | "UNSOLD" | "CANCELLED";
  playerId: string;
  player: AuctionPlayer;
  bids: Array<{
    id: string;
    amount: number;
    teamId: string;
    team: { id: string; name: string; colorPrimary: string };
  }>;
};

export type AuctionData = {
  id: string;
  name: string;
  code: string;
  status: "WAITING" | "LIVE" | "PAUSED" | "ENDED" | "LOBBY" | "COMPLETED";
  hostId: string;
  initialPurse: number;
  minSquad?: number;
  maxSquad?: number;
  currentLotId?: string | null;
  host: AuctionUser;
  teams: AuctionTeam[];
  players: AuctionPlayer[];
};

type ActivityItem = {
  id: string;
  timestamp: string;
  text: string;
  type: "start" | "bid" | "sold" | "unsold" | "info";
  teamColor?: string;
};

export function LiveAuctionRoom({ auctionId }: { auctionId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [data, setData] = useState<{
    auction: AuctionData;
    lot: AuctionLot | null;
    timer?: { deadline: number | null; remainingMs: number; isRunning: boolean };
    version?: number;
    isHost?: boolean;
    me: AuctionUser | null;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [customBid, setCustomBid] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"activity" | "chat">("activity");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: "Auctioneer", text: "Welcome to the Pro Kabaddi League 2026 Live Auction Arena!", time: "Just now" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [showCustomBidDrawer, setShowCustomBidDrawer] = useState(false);

  // Modals & Drawers
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterTab, setRosterTab] = useState<"UPCOMING" | "SOLD" | "UNSOLD" | "LEADERBOARD">("UPCOMING");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [soldCelebration, setSoldCelebration] = useState<{
    playerName: string;
    role: string;
    winningTeam: string;
    winningTeamColor: string;
    amount: number;
    rating: number;
  } | null>(null);

  // Voice Auctioneer Settings
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState(1.1);
  const [voicePitch, setVoicePitch] = useState(1.0);

  // Synchronized Server Timer Display
  const [lotTimerDuration, setLotTimerDuration] = useState<number>(15);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [serverDeadline, setServerDeadline] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const currentLotIdRef = useRef<string | null>(null);
  const highestBidIdRef = useRef<string | null>(null);

  // Activity Feed
  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: "init",
      timestamp: "Just now",
      text: "Auction initialized with 12 Pro Kabaddi Franchises",
      type: "start",
    },
  ]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = voiceSpeed;
      utt.pitch = voicePitch;
      window.speechSynthesis.speak(utt);
    } catch {
      // Speech fallback
    }
  }, [voiceEnabled, voiceSpeed, voicePitch]);

  function logActivity(text: string, type: ActivityItem["type"] = "info", teamColor?: string) {
    const item: ActivityItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      text,
      type,
      teamColor,
    };
    setActivities((prev) => [item, ...prev.slice(0, 40)]);
  }

  const loadState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error ?? "Failed to load auction");
      }
      const json = await res.json();
      const status = json.auction.status as string;
      if (status === "ENDED" || status === "COMPLETED") {
        router.push(`/auction/${auctionId}/results`);
        return;
      }
      setData(json);
      setError(null);

      // Check if user has claimed a team yet; if not, open selection modal
      const hasClaimedTeam = json.auction.teams.some(
        (t: AuctionTeam) => t.ownerId === json.me?.id
      );
      if (!hasClaimedTeam) {
        setShowTeamModal(true);
      }

      // Sync timer state from server
      if (json.timer) {
        if (json.timer.timerDuration) {
          setLotTimerDuration(json.timer.timerDuration);
        }
        setServerDeadline(json.timer.deadline);
        setIsTimerRunning(json.timer.isRunning);
        if (json.timer.deadline) {
          const remainingSec = Math.max(0, Math.ceil((json.timer.deadline - Date.now()) / 1000));
          setTimeLeft(remainingSec);
        } else if (typeof json.timer.remainingMs === "number") {
          setTimeLeft(Math.max(0, Math.ceil(json.timer.remainingMs / 1000)));
        }
      }

      // Announce new lot if changed
      if (json.lot?.id && json.lot.id !== currentLotIdRef.current) {
        currentLotIdRef.current = json.lot.id;
        highestBidIdRef.current = json.lot.bids[0]?.id ?? null;
        playRefereeWhistle();
        logActivity(`Lot on paddle: ${json.lot.player.name} (${json.lot.player.role.toUpperCase()})`, "start");
        speak(`${json.lot.player.name}, ${json.lot.player.role}, base price ${formatPurse(json.lot.player.basePrice)}`);
      } else {
        const latestBid = json.lot?.bids[0];
        if (latestBid && latestBid.id !== highestBidIdRef.current) {
          highestBidIdRef.current = latestBid.id;
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [auctionId, router, speak]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // Realtime Socket listener
  useAuctionSocket(auctionId, Boolean(data?.isHost), (event, payload) => {
    if (event === "auction:finalized") {
      router.push(`/auction/${auctionId}/results`);
      return;
    }

    if (event === "bid:placed" && payload && typeof payload === "object") {
      const p = payload as { bid: { amount: number; teamName: string; teamColor: string }; deadline: number };
      playBidChime();
      logActivity(`Bid placed: ${formatPurse(p.bid.amount)} by ${p.bid.teamName}`, "bid", p.bid.teamColor);
      speak(`${p.bid.teamName} bids ${formatPurse(p.bid.amount)}`);
      setServerDeadline(p.deadline);
      setIsTimerRunning(true);
      setTimeLeft(lotTimerDuration);
    } else if (event === "lot:sold" && payload && typeof payload === "object") {
      const p = payload as { playerName: string; winningTeam: string; winningTeamColor?: string; amount: number; rating?: number };
      playGavelHammer();
      logActivity(`🔨 SOLD! ${p.playerName} to ${p.winningTeam} for ${formatPurse(p.amount)}`, "sold");
      speak(`Hammer dropped! ${p.playerName} sold to ${p.winningTeam} for ${formatPurse(p.amount)}!`);

      // Reveal Player Individual Rating Celebration Overlay
      setSoldCelebration({
        playerName: p.playerName,
        role: currentPlayer?.role ?? "raider",
        winningTeam: p.winningTeam,
        winningTeamColor: p.winningTeamColor ?? "#F59E0B",
        amount: p.amount,
        rating: p.rating ?? currentPlayer?.rating ?? 88,
      });
      // Fast 2-second celebration overlay matching user request
      setTimeout(() => setSoldCelebration(null), 2000);
    } else if (event === "lot:unsold" && payload && typeof payload === "object") {
      const p = payload as { playerName: string };
      playRefereeWhistle();
      logActivity(`UNSOLD! ${p.playerName} passes without bids.`, "unsold");
      speak(`${p.playerName} passes unsold.`);
    } else if (event === "auction:paused") {
      setIsTimerRunning(false);
      logActivity("⏸ Auction paused by Admin.", "info");
      speak("Auction paused by administrator.");
    } else if (event === "auction:resumed") {
      setIsTimerRunning(true);
      logActivity("▶ Auction resumed by Admin.", "info");
      speak("Auction resumed.");
    } else if (event === "auction:timer-updated" && payload && typeof payload === "object") {
      const p = payload as { timerDuration: number };
      if (p.timerDuration) {
        setLotTimerDuration(p.timerDuration);
        setTimeLeft(p.timerDuration);
        logActivity(`Timer set to ${p.timerDuration}s`, "info");
      }
    }

    startTransition(() => {
      void loadState();
    });
  });

  // Client visual timer tick (DISPLAY-ONLY: NEVER sends auto-advance or hammer requests)
  useEffect(() => {
    if (!isTimerRunning || !serverDeadline) return;

    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((serverDeadline - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 3) speak("Going once!");
      if (left === 2) speak("Going twice!");
    }, 250);

    return () => clearInterval(interval);
  }, [isTimerRunning, serverDeadline, speak]);

  async function performAction(url: string, body?: object) {
    setActionBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resJson.error ?? "Action failed");
      }
      if (url.endsWith("/end")) {
        router.push(`/auction/${auctionId}/results`);
        return;
      }
      if (url.endsWith("/bid") && body && "amount" in body) {
        playBidChime();
        logActivity(`Paddle raised! Your bid: ${formatPurse(body.amount as number)}`, "bid", "#00D26A");
        speak(`Bid raised to ${formatPurse(body.amount as number)}!`);
      }
      await loadState();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionBusy(false);
    }
  }

  function copyCode() {
    if (!data?.auction.code) return;
    navigator.clipboard?.writeText(data.auction.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = {
      sender: myTeam ? myTeam.name : me?.name ?? "Spectator",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, msg]);
    setChatInput("");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090C15] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-orange border-t-transparent animate-spin" />
          <p className="font-mono text-sm tracking-wider uppercase text-muted">
            Connecting to PKL Auction Arena...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090C15] text-white p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white/5 border border-white/10 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white">Auction Error</h2>
          <p className="text-sm text-muted">{error}</p>
          <div className="flex gap-2 justify-center pt-2">
            <button
              onClick={() => void loadState()}
              className="px-4 py-2 rounded-xl bg-orange text-black font-bold text-xs uppercase"
            >
              Retry
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs uppercase hover:bg-white/20"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { auction, lot, me, isHost } = data;
  const isWaiting = auction.status === "WAITING" || auction.status === "LOBBY";
  const isPausedState = auction.status === "PAUSED";
  const isLiveState = auction.status === "LIVE";

  const myTeam = me ? auction.teams.find((t) => t.ownerId === me.id) : null;
  const upcomingCount = auction.players.filter((p) => p.status === "AVAILABLE").length;
  const soldCount = auction.players.filter((p) => p.status === "SOLD").length;
  const unsoldCount = auction.players.filter((p) => p.status === "UNSOLD").length;
  const claimedTeamsCount = auction.teams.filter((t) => Boolean(t.ownerId)).length;
  const highestBid = lot?.bids[0];
  const isLeadingBidder = Boolean(highestBid && myTeam && highestBid.teamId === myTeam.id);

  const currentPlayer = lot?.player;
  const playerDetails = currentPlayer ? getPlayerDetails(currentPlayer.name, currentPlayer.role, 88) : null;

  // Next bid calculation matching server increment slabs
  let nextBidAmount = currentPlayer ? currentPlayer.basePrice : 0;
  if (highestBid) {
    if (highestBid.amount < 10_000_000) {
      nextBidAmount = highestBid.amount + 500_000;
    } else if (highestBid.amount < 20_000_000) {
      nextBidAmount = highestBid.amount + 1_000_000;
    } else {
      nextBidAmount = highestBid.amount + 2_000_000;
    }
  }

  const roomMaxSquad = auction.maxSquad || 18;
  const canAfford = myTeam ? myTeam.currentPurse >= nextBidAmount : false;
  const squadFull = myTeam ? myTeam.purchases.length >= roomMaxSquad : false;

  const inviteUrl = typeof window !== "undefined"
    ? `${window.location.origin}/auction/${auction.id}`
    : `/auction/${auction.id}`;

  return (
    <div className="h-screen w-full bg-[#090C15] text-[#E2E8F0] select-none flex flex-col font-sans overflow-hidden">
      {/* 1. TOP CONTROL BAR */}
      <header className="h-14 sm:h-16 w-full bg-[#0D111C] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition group shrink-0" title="PKL Mock Auction Home">
            <img
              src="/logo.png"
              alt="PKL Mock Auction"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain drop-shadow transition-transform group-hover:scale-105"
            />
            <span className="hidden md:inline font-display text-sm font-black text-white tracking-wider">
              PKL MOCK <span className="text-orange">AUCTION</span>
            </span>
          </Link>
          <div className="h-5 w-px bg-white/10 hidden md:block" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-black tracking-wider text-white">
              {auction.code}
            </span>
            {isHost ? (
              <span className="px-2.5 py-0.5 rounded-full bg-orange/20 border border-orange/40 text-orange text-[10px] font-black tracking-wider flex items-center gap-1 shadow-sm">
                <span>👑</span>
                <span>ADMIN (HOST)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[10px] font-bold tracking-wider flex items-center gap-1">
                <span>🎮</span>
                <span>PARTICIPANT</span>
              </span>
            )}
          </div>
          <button
            onClick={copyCode}
            className="p-1.5 rounded-md hover:bg-white/10 text-muted hover:text-white transition"
            title="Copy room code"
          >
            {copied ? (
              <span className="text-xs text-emerald-400 font-semibold">Copied!</span>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {isPausedState && (
            <span className="px-3 py-1 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-black tracking-wider flex items-center gap-1.5 animate-pulse">
              <span>⏸</span>
              <span>AUCTION PAUSED</span>
            </span>
          )}

          {isWaiting && (
            <span className="px-3 py-1 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-black tracking-wider flex items-center gap-1.5">
              <span>⏳</span>
              <span>WAITING IN LOBBY</span>
            </span>
          )}

          {!myTeam && (
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-orange text-black text-xs font-black uppercase tracking-wider animate-pulse shadow-md"
            >
              <span>🛡️</span>
              <span>Choose Your Team</span>
            </button>
          )}

          {isHost && (
            <button
              onClick={() => setShowShareModal(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange/10 border border-orange/30 text-orange text-xs font-bold hover:bg-orange/20 transition"
              title="Host Control: Invite Friends to this auction"
            >
              <span>👥</span>
              <span>Invite Friend</span>
            </button>
          )}
        </div>

        {lot && (lot.status === "OPEN" || lot.status === "ACTIVE") && (
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <div className="px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-400 text-xs font-black tracking-wider uppercase">
              {playerDetails?.categoryLabel ?? "CATEGORY A"}
            </div>

            <div className="text-sm font-medium text-white/90">
              <span className="text-xs text-muted uppercase tracking-wider mr-1.5">BASE:</span>
              <strong className="font-mono text-base font-bold text-white">
                {formatPurse(lot.player.basePrice)}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted uppercase tracking-wider">BIDDER:</span>
              {highestBid ? (
                <div
                  className="px-2.5 py-0.5 rounded-md text-xs font-bold text-white flex items-center gap-1.5 shadow"
                  style={{ backgroundColor: highestBid.team.colorPrimary }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span>{highestBid.team.name}</span>
                </div>
              ) : (
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs font-bold text-muted">
                  NO BIDS
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Admin Controls: ONLY authenticated Host can Start, Pause, Resume, and End Auction */}
          {isHost && isWaiting && (
            <button
              onClick={() => {
                if (claimedTeamsCount < 1) {
                  setShowTeamModal(true);
                } else {
                  void performAction(`/api/auctions/${auction.id}/start`);
                }
              }}
              disabled={actionBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange to-amber-500 text-black font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-md transition animate-pulse"
              title="Admin Control: Start the live multiplayer auction"
            >
              <span>▶ START AUCTION ({claimedTeamsCount} Ready)</span>
            </button>
          )}

          {isHost && isLiveState && (
            <button
              onClick={() => void performAction(`/api/auctions/${auction.id}/pause`)}
              disabled={actionBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 text-xs font-bold tracking-wider uppercase transition shadow-sm"
              title="Admin Control: Pause Auction"
            >
              <span>⏸ PAUSE</span>
            </button>
          )}

          {isHost && isPausedState && (
            <button
              onClick={() => void performAction(`/api/auctions/${auction.id}/resume`)}
              disabled={actionBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30 text-xs font-black tracking-wider uppercase transition shadow-sm animate-pulse"
              title="Admin Control: Resume Auction"
            >
              <span>▶ RESUME</span>
            </button>
          )}

          {isHost && (isLiveState || isPausedState) && (
            <button
              onClick={() => {
                if (confirm("Host Action: End auction now and calculate Champion Squad results?")) {
                  void performAction(`/api/auctions/${auction.id}/end`);
                }
              }}
              disabled={actionBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white text-xs font-black tracking-wider uppercase transition shadow-sm"
              title="Admin Control: End Auction and View Final Results"
            >
              <span>⏹</span>
              <span>END AUCTION</span>
            </button>
          )}

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-muted hover:text-white transition"
            title="Audio & Room Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. THREE-COLUMN AUCTION LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: 12 TEAMS SIDEBAR */}
        <aside className="w-72 lg:w-80 border-r border-white/10 bg-[#0B0F19] flex flex-col shrink-0">
          <div className="p-3.5 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-muted">
                AUCTION TEAMS ({auction.teams.length})
              </h2>
              <span className="text-[10px] text-muted font-medium">PURSE / SQUAD</span>
            </div>
            {myTeam ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                ✓ {myTeam.name}
              </span>
            ) : (
              <button
                onClick={() => setShowTeamModal(true)}
                className="px-2.5 py-1 rounded-lg bg-orange/15 border border-orange/30 text-orange text-[10px] font-black uppercase tracking-wider hover:bg-orange/25 transition flex items-center gap-1 shadow-sm animate-pulse"
              >
                <span>🛡️</span>
                <span>Pick Team</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
            {auction.teams.map((team, index) => {
              const isMyTeam = team.id === myTeam?.id;
              const isSelected = selectedTeamId === team.id;
              const spent = team.initialPurse - team.currentPurse;

              const avgRating = team.purchases.length > 0
                ? team.purchases.reduce((acc, p) => acc + p.player.rating, 0) / team.purchases.length
                : 0;

              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamId(isSelected ? null : team.id)}
                  className={`p-3.5 transition-colors cursor-pointer ${
                    isMyTeam
                      ? "bg-emerald-500/10 border-l-4 border-emerald-400"
                      : isSelected
                      ? "bg-white/[0.08]"
                      : "hover:bg-white/[0.03]"
                  }`}
                  title="Click to view team details"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs font-bold text-muted w-4">
                        {index + 1}
                      </span>
                      <TeamBadge
                        name={team.name}
                        logoUrl={team.logoUrl}
                        color={team.colorPrimary}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white truncate leading-tight">
                          {team.name}
                        </h3>
                        <p className="text-[11px] text-muted flex items-center gap-1.5 truncate mt-0.5">
                          {isMyTeam ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-emerald-400 font-bold">
                                {me?.name ?? "Dharaneshwaran R"} (You)
                              </span>
                            </>
                          ) : (
                            <span className="text-muted/80">
                              {team.owner ? `🔒 ${team.owner.name}` : "⚪ Unclaimed"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-sm font-bold text-white">
                        {formatPurse(team.currentPurse)}
                      </div>
                      <div className="text-[11px] font-mono text-muted">
                        {team.purchases.length}/{roomMaxSquad}
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer */}
                  <div className="flex items-center justify-between text-[10px] text-muted font-semibold pt-2 mt-2 border-t border-white/5">
                    <span>
                      SPENT: <strong className="text-white font-mono">{formatPurse(spent)}</strong>
                    </span>
                    <span>
                      AVG RATING: <strong className="text-yellow-400 font-mono">{avgRating ? avgRating.toFixed(1) : "N/A"}</strong>
                    </span>
                  </div>

                  {/* Expanded Sub-details */}
                  {isSelected && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 text-xs animate-in fade-in">
                      {team.purchases.length === 0 ? (
                        <p className="text-center text-[11px] text-muted py-2">
                          NO PLAYERS JOINED YET
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {team.purchases.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-[11px] bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <PlayerAvatar name={p.player.name} role={p.player.role} size="xs" />
                                <span className="text-white truncate max-w-[110px] font-medium">
                                  {p.player.name}
                                </span>
                                {p.player.rating > 0 && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-black text-[9px] border border-amber-500/40 shrink-0">
                                    ★{p.player.rating}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-orange-400 font-bold shrink-0">
                                {formatPurse(p.soldPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* CENTER COLUMN: LIVE AUCTION STAGE */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto bg-gradient-to-b from-[#090C15] to-[#0D121F]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
            </div>
          )}

          {isLiveState && currentPlayer && playerDetails ? (
            <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center space-y-4">
              {/* Main Player Display Card with Official Badge Emblem */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0D1220] border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-orange/5 rounded-full blur-3xl pointer-events-none" />

                {/* SOLD CELEBRATION OVERLAY */}
                {soldCelebration && (
                  <div
                    onClick={() => setSoldCelebration(null)}
                    className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-150 border-2 border-emerald-500/80 shadow-[0_0_50px_rgba(16,185,129,0.3)] cursor-pointer"
                    title="Click to dismiss"
                  >
                    <span className="px-4 py-1 rounded-full bg-emerald-500 text-black font-black text-xs uppercase tracking-widest animate-bounce">
                      🔨 HAMMER DROPPED • OFFICIALLY SOLD!
                    </span>
                    <PlayerAvatar name={soldCelebration.playerName} size="lg" className="my-3 border-2 border-emerald-400 shadow-2xl" />
                    <h2 className="font-display text-3xl sm:text-4xl text-white font-black mt-1">
                      {soldCelebration.playerName}
                    </h2>
                    <p className="text-base sm:text-lg font-bold mt-2" style={{ color: soldCelebration.winningTeamColor }}>
                      Sold to {soldCelebration.winningTeam} for {formatPurse(soldCelebration.amount)}
                    </p>
                    <span className="text-[10px] text-muted mt-3 uppercase tracking-widest opacity-80">
                      Tap anywhere to continue
                    </span>
                  </div>
                )}

                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                  {/* Badge Emblem Player Card (Initial Monogram, Category, Role) */}
                  <PlayerCardPhoto
                    name={currentPlayer.name}
                    role={currentPlayer.role}
                    categoryLabel={playerDetails.categoryLabel}
                    rating={currentPlayer.rating}
                    jerseyNumber={17}
                    isSold={false}
                  />

                  {/* Player Information & 4 Authentic Stats */}
                  <div className="flex-1 w-full space-y-3.5 text-center sm:text-left">
                    <div>
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-orange/20 text-orange text-[10px] font-black tracking-widest uppercase">
                          {currentPlayer.role}
                        </span>
                        <span className="text-xs text-muted font-medium">
                          {playerDetails.categoryLabel}
                        </span>
                      </div>
                      <h1 className="font-display text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                        {currentPlayer.name}
                      </h1>
                    </div>

                    {/* 4 Authentic Pro Kabaddi Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-white/[0.04] border border-white/5">
                      <div className="text-left">
                        <div className="text-[9px] font-extrabold text-muted uppercase tracking-wider">
                          {playerDetails.stat1Label}
                        </div>
                        <div className={`font-mono text-sm font-black ${playerDetails.stat1Color} mt-0.5`}>
                          {playerDetails.stat1Value}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-[9px] font-extrabold text-muted uppercase tracking-wider">
                          {playerDetails.stat2Label}
                        </div>
                        <div className={`font-mono text-sm font-black ${playerDetails.stat2Color} mt-0.5`}>
                          {playerDetails.stat2Value}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-[9px] font-extrabold text-muted uppercase tracking-wider">
                          {playerDetails.stat3Label}
                        </div>
                        <div className={`font-mono text-sm font-black ${playerDetails.stat3Color} mt-0.5`}>
                          {playerDetails.stat3Value}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-[9px] font-extrabold text-muted uppercase tracking-wider">
                          {playerDetails.stat4Label}
                        </div>
                        <div className={`font-mono text-sm font-black ${playerDetails.stat4Color} mt-0.5`}>
                          {playerDetails.stat4Value}
                        </div>
                      </div>
                    </div>

                    {/* Current Bid & Server-Synchronized Timer */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] font-extrabold text-muted uppercase tracking-widest block">
                          CURRENT BID
                        </span>
                        <div className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight mt-0.5">
                          {formatPurse(highestBid ? highestBid.amount : currentPlayer.basePrice)}
                        </div>
                        {highestBid && (
                          <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1.5">
                            <span>Held by:</span>
                            <strong className="text-white font-semibold">
                              {highestBid.team.name}
                            </strong>
                          </p>
                        )}
                      </div>

                      <div className="relative flex items-center justify-center">
                        <svg className="w-14 h-14 transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r={22}
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="3"
                            fill="transparent"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r={22}
                            stroke={timeLeft <= 3 ? "#E63946" : timeLeft <= 5 ? "#FFD400" : "#00D26A"}
                            strokeWidth="3"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 22}
                            strokeDashoffset={2 * Math.PI * 22 * (1 - Math.max(0, Math.min(1, timeLeft / lotTimerDuration)))}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-linear"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`font-mono text-sm font-black leading-none ${
                            timeLeft <= 3 ? "text-red-500 animate-ping" : "text-emerald-400"
                          }`}>
                            {timeLeft}
                          </span>
                          <span className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5">
                            SEC
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Primary Action Area: Giant Bidding Paddle */}
              <div className="space-y-2">
                {myTeam && (
                  <div className="flex items-center justify-between px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-muted tracking-widest">
                        BIDDING AS:
                      </span>
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-sm flex items-center gap-1.5"
                        style={{ backgroundColor: myTeam.colorPrimary }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span>{myTeam.name}</span>
                      </span>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-emerald-400">
                      Purse: {formatPurse(myTeam.currentPurse)}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1 min-w-0">
                      {!myTeam ? (
                        <button
                          onClick={() => setShowTeamModal(true)}
                          className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-orange to-amber-500 text-black font-black text-sm sm:text-base tracking-wider uppercase shadow-[0_4px_20px_rgba(255,107,0,0.35)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                        >
                          <span>👉 SELECT YOUR FRANCHISE TO START BIDDING 👈</span>
                        </button>
                      ) : isLeadingBidder ? (
                        <div className="w-full py-4 px-5 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 font-black text-sm sm:text-base tracking-wider uppercase text-center shadow-lg animate-pulse flex items-center justify-center gap-2">
                          <span>✓</span>
                          <span>YOU HOLD THE LEADING BID ({formatPurse(highestBid?.amount ?? 0)})</span>
                        </div>
                      ) : squadFull ? (
                        <div className="w-full py-4 px-5 rounded-2xl bg-white/10 border border-white/15 text-muted font-bold text-sm uppercase text-center">
                          Squad Full ({roomMaxSquad}/{roomMaxSquad} Players)
                        </div>
                      ) : !canAfford ? (
                        <div className="w-full py-4 px-5 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-sm uppercase text-center">
                          Insufficient Purse for {formatPurse(nextBidAmount)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => performAction(`/api/auctions/${auction.id}/bid`, { amount: nextBidAmount })}
                            disabled={actionBusy}
                            className="flex-1 py-4 px-5 rounded-2xl bg-gradient-to-r from-orange via-amber-500 to-orange text-black font-black text-base sm:text-lg tracking-wider uppercase shadow-[0_4px_25px_rgba(255,107,0,0.4)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                          >
                            <span>BID {formatPurse(nextBidAmount)}</span>
                          </button>

                          <button
                            onClick={() => setShowCustomBidDrawer(!showCustomBidDrawer)}
                            disabled={actionBusy}
                            className="h-12 sm:h-14 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition"
                          >
                            <span>Custom</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 3-Lines (☰) Menu Button on Right Side of Bidding Area */}
                    <button
                      type="button"
                      onClick={() => {
                        setRosterTab("UPCOMING");
                        setShowRosterModal(true);
                      }}
                      className="h-12 sm:h-14 px-4 rounded-2xl bg-[#141B2D] hover:bg-[#1C253E] border border-orange/40 hover:border-orange text-white font-black text-xs uppercase tracking-wider flex items-center justify-center transition shadow-lg group shrink-0"
                      title="3-Lines Menu: ☰ Upcoming, Sold, Unsold & Leaderboard"
                    >
                      <div className="flex flex-col gap-1 justify-center items-center">
                        <span className="w-5 h-0.5 bg-orange rounded-full group-hover:bg-amber-400 transition" />
                        <span className="w-5 h-0.5 bg-orange rounded-full group-hover:bg-amber-400 transition" />
                        <span className="w-5 h-0.5 bg-orange rounded-full group-hover:bg-amber-400 transition" />
                      </div>
                    </button>
                  </div>

                  {/* Custom Bid Drawer */}
                  {showCustomBidDrawer && myTeam && !isLeadingBidder && (
                    <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                      <input
                        type="number"
                        placeholder={`Min: ₹${(nextBidAmount / 100_000).toFixed(0)} Lakhs`}
                        value={customBid}
                        onChange={(e) => setCustomBid(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-orange"
                      />
                      <button
                        onClick={() => {
                          const val = Number(customBid) * 100_000;
                          if (val >= nextBidAmount && val <= myTeam.currentPurse) {
                            void performAction(`/api/auctions/${auction.id}/bid`, { amount: val });
                            setCustomBid("");
                            setShowCustomBidDrawer(false);
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs uppercase hover:brightness-110 disabled:opacity-40"
                      >
                        Bid
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="my-auto mx-auto max-w-md text-center p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
              <h2 className="font-display text-3xl text-white font-black mb-2">
                {isWaiting ? "Auction in Lobby" : isPausedState ? "Auction Paused" : "All Lots Auctioned!"}
              </h2>
              <p className="text-sm text-muted mb-6">
                {isWaiting
                  ? "Participants are claiming franchises. The auction will begin when Admin starts it."
                  : isPausedState
                  ? "The auctioneer has paused live bidding. Stand by for resumption."
                  : "All players in this session have completed their lots."}
              </p>

              {isWaiting ? (
                isHost ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        if (claimedTeamsCount < 1) {
                          setShowTeamModal(true);
                        } else {
                          void performAction(`/api/auctions/${auction.id}/start`);
                        }
                      }}
                      disabled={actionBusy}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-orange via-amber-500 to-orange text-black font-black uppercase tracking-wider text-sm sm:text-base hover:brightness-110 shadow-[0_4px_25px_rgba(255,107,0,0.4)] transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>▶</span>
                      <span>
                        {claimedTeamsCount < 1
                          ? "CHOOSE YOUR TEAM TO START AUCTION"
                          : `START AUCTION NOW (${claimedTeamsCount} Coaches Ready)`}
                      </span>
                    </button>

                    <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-[11px] text-muted space-y-1.5 text-left">
                      <p className="font-black text-white flex items-center gap-1.5">
                        <span className="text-orange">⚡</span>
                        <span>Multiplayer Ready:</span>
                      </p>
                      <p>
                        You do <strong className="text-orange">NOT</strong> need all 12 teams! You can start right now with any number of coaches (e.g. 2, 3, 5, or more players).
                      </p>
                      <p className="pt-1 border-t border-white/5 font-mono text-[10px] text-emerald-400">
                        Franchises Claimed: {claimedTeamsCount} / 12
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-muted text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span>⏳ Waiting for Admin to start the auction... ({claimedTeamsCount} coaches joined)</span>
                    </div>
                    <p className="text-[11px] text-muted">
                      Admin can start the auction at any time with the currently joined coaches!
                    </p>
                  </div>
                )
              ) : isPausedState ? (
                isHost ? (
                  <button
                    onClick={() => void performAction(`/api/auctions/${auction.id}/resume`)}
                    disabled={actionBusy}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-400 text-black font-black uppercase tracking-wider text-sm sm:text-base hover:brightness-110 shadow-lg transition"
                  >
                    ▶ RESUME AUCTION NOW (ADMIN)
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                    <span>⏸ Auction is paused. Please wait for the Admin to resume...</span>
                  </div>
                )
              ) : (
                <button
                  onClick={() => router.push(`/auction/${auction.id}/results`)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-orange text-black font-bold uppercase tracking-wider text-xs hover:brightness-110 shadow-lg"
                >
                  View Final Results
                </button>
              )}
            </div>
          )}
        </main>

        {/* RIGHT COLUMN: REALTIME ACTIVITY & CHAT */}
        <aside className="w-72 lg:w-80 border-l border-white/10 bg-[#0B0F19] hidden md:flex flex-col shrink-0">
          <div className="flex border-b border-white/10 text-xs font-bold">
            <button
              onClick={() => setRightTab("activity")}
              className={`flex-1 py-3 text-center uppercase tracking-wider transition ${
                rightTab === "activity"
                  ? "text-orange border-b-2 border-orange bg-white/[0.02]"
                  : "text-muted hover:text-white"
              }`}
            >
              Activity Feed
            </button>
            <button
              onClick={() => setRightTab("chat")}
              className={`flex-1 py-3 text-center uppercase tracking-wider transition ${
                rightTab === "chat"
                  ? "text-orange border-b-2 border-orange bg-white/[0.02]"
                  : "text-muted hover:text-white"
              }`}
            >
              War Room Chat
            </button>
          </div>

          {rightTab === "activity" ? (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar text-xs">
              {activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span className="uppercase font-bold tracking-wider">{act.type}</span>
                    <span>{act.timestamp}</span>
                  </div>
                  <p className="text-white font-medium text-xs leading-snug">{act.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar text-xs">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-orange">{msg.sender}</span>
                      <span className="text-muted">{msg.time}</span>
                    </div>
                    <p className="text-white/90 text-xs">{msg.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-orange"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-orange text-black font-bold text-xs uppercase"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </aside>
      </div>

      {/* 3. SLEEK FOOTER */}
      <footer className="h-7 w-full bg-[#0A0D17] border-t border-white/5 px-4 flex items-center justify-between text-[11px] text-muted shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-white/80">PKL Mock Auction Arena</span>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="hidden sm:inline">Room: <strong className="text-white font-mono">{auction.code}</strong></span>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="hidden sm:inline">Squad Cap: <strong className="text-amber-400 font-mono">{roomMaxSquad} Players</strong></span>
        </div>
        <div className="flex items-center gap-1.5 font-bold tracking-wider uppercase text-[10px]">
          <span className="text-muted">Made by</span>
          <span className="text-orange font-black">Dharaneshwaran</span>
        </div>
      </footer>

      {/* SHARE / INVITE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-[#0D1220] border border-white/15 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-white">Invite Friends</h3>
              <button onClick={() => setShowShareModal(false)} className="text-muted hover:text-white">✕</button>
            </div>
            <p className="text-xs text-muted">
              Share this link with your friends. They will be prompted to pick their franchise when they join.
            </p>
            <div className="p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-orange break-all select-all">
              {inviteUrl}
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(inviteUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange to-amber-500 text-black font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg"
            >
              {copied ? "Link Copied!" : "Copy Invite Link"}
            </button>
          </div>
        </div>
      )}

      {/* COMPLETE ROSTER MODAL */}
      {showRosterModal && (
        <MegaAuctionRosterModal
          onClose={() => setShowRosterModal(false)}
          teams={auction.teams}
          players={auction.players}
          currentLotPlayerId={lot?.playerId ?? null}
          initialTab={rosterTab}
        />
      )}

      {/* ROOM & AUDIO SETTINGS MODAL */}
      {showSettingsModal && (
        <RoomSettingsModal
          timerDuration={lotTimerDuration}
          onUpdateTimer={async (sec: number) => {
            setLotTimerDuration(sec);
            setTimeLeft(sec);
            await performAction(`/api/auctions/${auction.id}/timer`, { duration: sec });
          }}
          voiceEnabled={voiceEnabled}
          onToggleVoice={setVoiceEnabled}
          voiceSpeed={voiceSpeed}
          onUpdateSpeed={setVoiceSpeed}
          voicePitch={voicePitch}
          onUpdatePitch={setVoicePitch}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* FRANCHISE SELECTION MODAL */}
      <TeamSelectionModal
        teams={auction.teams}
        me={me}
        currentTeamId={myTeam?.id}
        isOpen={showTeamModal}
        onSelectTeam={async (teamId, coachName) => {
          await performAction(`/api/auctions/${auction.id}/join-team`, { teamId, coachName });
          setShowTeamModal(false);
          playRefereeWhistle();
          logActivity(
            `Coach ${coachName} took charge of ${auction.teams.find((t) => t.id === teamId)?.name ?? "a franchise"}!`,
            "start",
            auction.teams.find((t) => t.id === teamId)?.colorPrimary
          );
        }}
        onClose={() => setShowTeamModal(false)}
        canClose={Boolean(myTeam)}
      />
    </div>
  );
}
