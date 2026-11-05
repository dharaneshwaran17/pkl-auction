"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FICTIONAL_TEAMS } from "@/lib/auction/roster";
import { TeamBadge } from "./TeamBadge";
import { formatPurse } from "@/lib/money";

export function HomeClient() {
  const router = useRouter();
  const [tab, setTab] = useState<"CREATE" | "JOIN" | "HISTORY">("CREATE");
  const [roomName, setRoomName] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [claimTeamOnCreate, setClaimTeamOnCreate] = useState(false);
  const [selectedTeamIndex, setSelectedTeamIndex] = useState(0);
  const [auctionMode, setAuctionMode] = useState<"MEGA" | "CLASSIC" | "SPRINT">("MEGA");
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Recent simulated signings ticker (Image 4 match)
  const recentSignings = [
    { team: "Tamil Thalaivas", player: "Pawan Sehrawat", price: 260_000_000, color: "#FDB913" },
    { team: "Puneri Paltan", player: "M. Shadloui", price: 215_000_000, color: "#F26522" },
    { team: "Bengaluru Bulls", player: "Pardeep Narwal", price: 180_000_000, color: "#D2232A" },
    { team: "Jaipur Pink Panthers", player: "Arjun Deshwal", price: 205_000_000, color: "#E91E63" },
    { team: "Dabang Delhi K.C.", player: "Naveen Kumar", price: 240_000_000, color: "#1B365D" },
    { team: "Bengal Warriorz", player: "Fazel Atrachali", price: 160_000_000, color: "#1C75BC" },
  ];

  async function ensureSession() {
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "Coach" }),
    });
    if (!res.ok) throw new Error("Could not start session");
  }

  async function enterLiveRoom() {
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const res = await fetch("/api/auctions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "PKLLIVE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to join PKLLIVE");
      router.push(`/auction/${data.auctionId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function createAuction() {
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const initialPurse = auctionMode === "MEGA" ? 100_000_000 : auctionMode === "CLASSIC" ? 80_000_000 : 50_000_000;
      const minSquad = auctionMode === "MEGA" ? 12 : auctionMode === "CLASSIC" ? 10 : 8;
      const maxSquad = auctionMode === "MEGA" ? 18 : auctionMode === "CLASSIC" ? 14 : 10;

      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName.trim() || `${name.trim() || "PKL"}'s Mock Auction`,
          hostName: name.trim() || "Host Admin",
          initialPurse,
          minSquad,
          maxSquad,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Create failed");

      // If user chose to claim a team right away on creation
      if (claimTeamOnCreate) {
        const chosenFranchise = FICTIONAL_TEAMS[selectedTeamIndex];
        try {
          const teamsRes = await fetch(`/api/auctions/${data.auctionId}`);
          const auctionJson = await teamsRes.json();
          const myTeam = auctionJson.auction?.teams?.find(
            (t: { name: string }) => t.name === chosenFranchise.name
          );
          if (myTeam) {
            await fetch(`/api/auctions/${data.auctionId}/join-team`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ teamId: myTeam.id }),
            });
          }
        } catch {
          // Non-blocking fallback
        }
      }

      router.push(`/auction/${data.auctionId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function joinAuction() {
    if (!code.trim()) {
      setError("Please enter the 6-character room code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const res = await fetch("/api/auctions/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Join failed");
      const path =
        data.status === "COMPLETED"
          ? `/auction/${data.auctionId}/results`
          : `/auction/${data.auctionId}`;
      router.push(path);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080B14] text-[#E2E8F0] px-4 py-8 sm:py-12 flex flex-col items-center justify-between font-sans select-none relative overflow-hidden">
      {/* Background Stadium Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-orange/15 to-transparent blur-3xl pointer-events-none" />

      {/* Hero Header */}
      <div className="text-center space-y-3 z-10 max-w-3xl flex flex-col items-center">
        {/* PKL Mock Auction Brand Logo */}
        <div className="relative group my-1">
          <div className="absolute inset-0 bg-gradient-to-r from-orange to-amber-500 rounded-full blur-2xl opacity-25 group-hover:opacity-40 transition-opacity" />
          <img
            src="/logo.png"
            alt="PKL Mock Auction Logo"
            className="relative z-10 w-32 h-32 sm:w-44 sm:h-44 object-contain drop-shadow-[0_10px_30px_rgba(255,107,0,0.35)] transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <h1 className="font-display text-5xl sm:text-7xl font-black tracking-wider text-white">
          PKL MOCK <span className="text-orange">AUCTION</span>
        </h1>
        <p className="text-xs sm:text-sm text-muted max-w-2xl mx-auto leading-relaxed">
          The ultimate live multiplayer Pro Kabaddi League mock auction simulator. Create rooms, invite your friends, select your favorite franchise, and bid live in real-time.
        </p>

        {/* 3 Step Flow Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted">
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white">
            1. CREATE ROOM
          </span>
          <span>→</span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white">
            2. INVITE FRIENDS
          </span>
          <span>→</span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-orange">
            3. START BIDDING
          </span>
        </div>
      </div>

      {/* Main 2-Column Lobby Card (Image 4 match) */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 my-8 z-10">
        {/* Left Column: LIVE AUCTION ROOMS & RECENT SIGNINGS */}
        <div className="lg:col-span-5 rounded-3xl bg-[#0D1220]/90 border border-white/10 p-6 flex flex-col justify-between shadow-2xl backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h3 className="font-display text-xl text-white tracking-wider">
                  LIVE AUCTION ROOMS
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            {/* Quick Play Room Seed */}
            <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-orange/50 transition flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-orange">CODE: PKLLIVE</span>
                <h4 className="font-bold text-sm text-white mt-0.5">PKL Season 11 Mock Auction</h4>
                <p className="text-[11px] text-muted">12 Franchises • 80 Superstars</p>
              </div>
              <button
                onClick={() => void enterLiveRoom()}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-orange text-black font-extrabold text-xs uppercase tracking-wider hover:brightness-110 shadow disabled:opacity-50"
              >
                Enter
              </button>
            </div>

            {/* Recent Signings Feed */}
            <div className="mt-6">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted block mb-3">
                RECENT SIGNINGS
              </span>
              <div className="space-y-2">
                {recentSignings.map((sig, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full" style={{ background: sig.color }} />
                      <span className="font-semibold text-white truncate max-w-[140px]">
                        {sig.player}
                      </span>
                      <span className="text-muted text-[11px] truncate">({sig.team})</span>
                    </div>
                    <span className="font-mono font-bold text-orange text-[11px]">
                      {formatPurse(sig.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-[11px] text-muted">
              Share your room code with friends on the same WiFi or LAN for private multiplayer!
            </p>
          </div>
        </div>

        {/* Right Column: CREATE / JOIN / HISTORY PANEL (Image 4 match) */}
        <div className="lg:col-span-7 rounded-3xl bg-[#0D1220]/95 border border-white/10 p-6 sm:p-7 shadow-2xl backdrop-blur-md">
          {/* Tabs: CREATE | JOIN | HISTORY */}
          <div className="flex border-b border-white/10 pb-4 mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("CREATE")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  tab === "CREATE"
                    ? "bg-gradient-to-r from-orange to-amber-500 text-black shadow-lg"
                    : "text-muted hover:text-white bg-white/5"
                }`}
              >
                CREATE
              </button>
              <button
                onClick={() => setTab("JOIN")}
                className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  tab === "JOIN"
                    ? "bg-gradient-to-r from-orange to-amber-500 text-black shadow-lg"
                    : "text-muted hover:text-white bg-white/5"
                }`}
              >
                JOIN
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red/10 border border-red/30 text-xs text-red font-semibold">
              {error}
            </div>
          )}

          {tab === "CREATE" ? (
            <div className="space-y-6 animate-in fade-in">
              {/* Room Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-muted block">
                  AUCTION ROOM NAME
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. PKL Mega Clash 2026"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange font-semibold"
                />
              </div>

              {/* Host Nickname */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-muted block">
                  YOUR HOST / COACH NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Admin Dharan"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange font-semibold"
                />
              </div>

              {/* Franchise Pre-selection Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {claimTeamOnCreate ? "🎮 CLAIM A TEAM FOR HOST NOW" : "👑 IMPARTIAL HOST / AUCTIONEER"}
                    </span>
                    <p className="text-[10px] text-muted">
                      {claimTeamOnCreate
                        ? "Host will reserve one franchise immediately."
                        : "All 12 PKL Franchises will start free and unclaimed for you and your friends to pick."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClaimTeamOnCreate(!claimTeamOnCreate)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition ${
                      claimTeamOnCreate
                        ? "bg-orange text-black"
                        : "bg-white/10 text-muted hover:text-white"
                    }`}
                  >
                    {claimTeamOnCreate ? "Pre-Claim Active" : "+ Pick Team Now"}
                  </button>
                </div>

                {claimTeamOnCreate && (
                  <div className="space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
                        CHOOSE YOUR FRANCHISE
                      </span>
                      <span className="text-xs font-bold text-orange">
                        {FICTIONAL_TEAMS[selectedTeamIndex].name}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {FICTIONAL_TEAMS.map((team, idx) => {
                        const isSelected = selectedTeamIndex === idx;
                        return (
                          <button
                            key={team.name}
                            type="button"
                            onClick={() => setSelectedTeamIndex(idx)}
                            className={`relative p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                              isSelected
                                ? "border-orange bg-orange/20 shadow-[0_0_15px_rgba(255,107,0,0.3)] scale-105"
                                : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                            }`}
                            title={team.name}
                          >
                            <TeamBadge name={team.name} color={team.colorPrimary} size="sm" />
                            <span className="text-[9px] font-bold text-white truncate max-w-full mt-1">
                              {team.name.split(" ")[0]}
                            </span>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange text-black flex items-center justify-center text-[10px] font-bold">
                                ✓
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted block">
                  AUCTION MODE
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["MEGA", "CLASSIC", "SPRINT"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAuctionMode(mode)}
                      className={`p-3 rounded-xl border text-center transition ${
                        auctionMode === mode
                          ? "border-orange bg-orange/15 text-white"
                          : "border-white/10 bg-white/5 text-muted hover:text-white"
                      }`}
                    >
                      <div className="font-black text-xs uppercase tracking-wider">{mode}</div>
                      <div className="text-[10px] text-muted mt-0.5">
                        {mode === "MEGA" ? "18 Players • ₹10 Cr" : mode === "CLASSIC" ? "14 Players • ₹8 Cr" : "10 Players • ₹5 Cr"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Public / Private Room Visibility Toggle (Image 4 match) */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {isPublic ? "PUBLIC ROOM VISIBILITY" : "PRIVATE ROOM (FRIENDS ONLY)"}
                  </span>
                  <p className="text-[10px] text-muted">
                    {isPublic
                      ? "Listed in the public directory for anyone to join"
                      : "Only players with the secret Room Code or invite link can join"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    isPublic ? "bg-orange" : "bg-white/20"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-black transition-transform ${
                      isPublic ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Start Auction Button */}
              <button
                type="button"
                onClick={() => void createAuction()}
                disabled={busy}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange via-amber-500 to-orange text-black font-black text-base uppercase tracking-wider shadow-xl hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <span>✨</span>
                <span>{busy ? "CREATING NEW ROOM..." : "CREATE & OPEN NEW ROOM"}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-muted block">
                  ENTER ROOM CODE
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PKLLIVE or YIQJA1"
                  maxLength={10}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-black text-orange tracking-widest focus:outline-none focus:border-orange text-center uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-widest text-muted block">
                  YOUR COACH NAME
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Coach Friend"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange"
                />
              </div>

              <button
                type="button"
                onClick={() => void joinAuction()}
                disabled={busy || !code.trim()}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-black text-base uppercase tracking-wider shadow-xl hover:brightness-110 disabled:opacity-40 transition"
              >
                {busy ? "JOINING ROOM..." : "JOIN AUCTION ROOM"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-muted/70 z-10 pt-4 flex flex-col items-center gap-1.5 pb-6">
        <p>Best Auction Squad ranking • Pure deterministic Pro Kabaddi fantasy auction</p>
        <p className="text-orange text-xs font-black tracking-widest uppercase">
          Made by Dharaneshwaran
        </p>
      </footer>
    </main>
  );
}
