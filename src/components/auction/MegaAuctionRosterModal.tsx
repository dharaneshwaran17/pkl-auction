"use client";

import { useState } from "react";
import type { AuctionPlayer, AuctionTeam } from "./LiveAuctionRoom";
import { formatPurse } from "@/lib/money";
import { getPlayerImageUrl } from "@/lib/auction/playerImages";
import { TeamBadge } from "@/components/TeamBadge";

interface MegaAuctionRosterModalProps {
  players: AuctionPlayer[];
  teams: AuctionTeam[];
  currentLotPlayerId?: string | null;
  initialTab?: "UPCOMING" | "SOLD" | "UNSOLD" | "LEADERBOARD";
  onClose: () => void;
}

function PlayerRosterThumb({ name }: { name: string }) {
  const photoUrl = getPlayerImageUrl(name);
  const [error, setError] = useState(false);
  const cleanName = name.replace(/\s*\([^)]*\)/g, "").trim();
  const initials = cleanName.slice(0, 2).toUpperCase();

  if (photoUrl && !error) {
    return (
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gradient-to-b from-[#182030] to-[#0A0D16] border border-white/15 mb-2.5 flex items-end justify-center group-hover:border-orange/50 transition-colors p-1">
        <img
          src={photoUrl}
          alt={cleanName}
          onError={() => setError(true)}
          className="w-full h-full object-contain object-bottom drop-shadow-md transition-transform duration-200 group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-gradient-to-b from-[#182030] to-[#0A0D16] border border-white/15 mb-2.5 flex items-center justify-center group-hover:border-orange/50 transition-colors">
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-amber-500/40 bg-gradient-to-br from-white/10 to-black/60 flex items-center justify-center shadow-lg">
        <span className="font-display font-black text-white text-sm sm:text-base tracking-widest">
          {initials}
        </span>
      </div>
    </div>
  );
}

export function MegaAuctionRosterModal({
  players,
  teams,
  currentLotPlayerId,
  initialTab,
  onClose,
}: MegaAuctionRosterModalProps) {
  const [filterTab, setFilterTab] = useState<"UPCOMING" | "SOLD" | "UNSOLD" | "LEADERBOARD">(
    initialTab ?? "UPCOMING"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Map each player to its purchase info if sold
  const purchaseMap = new Map<
    string,
    { teamName: string; colorPrimary: string; soldPrice: number; rating: number }
  >();
  teams.forEach((t) => {
    t.purchases.forEach((p) => {
      purchaseMap.set(p.player.id, {
        teamName: t.name,
        colorPrimary: t.colorPrimary,
        soldPrice: p.soldPrice,
        rating: p.player.rating,
      });
    });
  });

  const upcomingPlayers = players.filter((p) => p.status === "AVAILABLE");
  const soldPlayers = players.filter((p) => p.status === "SOLD");
  const unsoldPlayers = players.filter((p) => p.status === "UNSOLD");

  // Leaderboard data
  const allSoldPurchases = teams
    .flatMap((t) =>
      t.purchases.map((p) => ({
        ...p,
        teamName: t.name,
        colorPrimary: t.colorPrimary,
        teamLogo: t.logoUrl,
      }))
    )
    .sort((a, b) => b.soldPrice - a.soldPrice);

  const teamLeaderboard = [...teams].sort((a, b) => b.purchases.length - a.purchases.length);

  let displayList: AuctionPlayer[] = [];
  if (filterTab === "UPCOMING") {
    displayList = [...upcomingPlayers].sort((a, b) => {
      if (b.basePrice !== a.basePrice) return b.basePrice - a.basePrice;
      return a.name.localeCompare(b.name);
    });
  } else if (filterTab === "SOLD") {
    displayList = soldPlayers;
  } else if (filterTab === "UNSOLD") {
    displayList = unsoldPlayers;
  } else {
    displayList = [...players].sort((a, b) => b.basePrice - a.basePrice);
  }

  if (searchTerm.trim()) {
    displayList = displayList.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.role.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Group upcoming players in clean ordered sets (Marquee, Set 1, Set 2...)
  const marqueeSet = displayList.filter((p) => p.basePrice >= 3_000_000).sort((a, b) => a.name.localeCompare(b.name));
  const set1 = displayList.filter((p) => p.basePrice === 2_000_000).sort((a, b) => a.name.localeCompare(b.name));
  const set2 = displayList.filter((p) => p.basePrice === 1_300_000).sort((a, b) => a.name.localeCompare(b.name));
  const set3 = displayList.filter((p) => p.basePrice < 1_300_000).sort((a, b) => a.name.localeCompare(b.name));

  const sections = filterTab === "UPCOMING"
    ? [
        { title: "SET 1 • MARQUEE SUPERSTARS", items: marqueeSet },
        { title: "SET 2 • CATEGORY A STARS", items: set1 },
        { title: "SET 3 • CATEGORY B SPECIALISTS", items: set2 },
        { title: "SET 4 • EMERGING TALENTS", items: set3 },
      ].filter((s) => s.items.length > 0)
    : [{ title: `${filterTab} PLAYERS (${displayList.length})`, items: displayList }];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in select-none">
      <div className="relative w-full max-w-6xl h-[90vh] bg-[#0C101C] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl text-white tracking-wider">
              MEGA AUCTION ROSTER
            </h2>
            <p className="text-xs text-muted uppercase tracking-widest mt-0.5">
              COMPLETE PLAYER INVENTORY ({players.length} TOTAL PLAYERS)
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Controls + Search */}
        <div className="px-6 py-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0A0D17]">
          {/* 4 Pill Tabs matching User Request: UPCOMING, SOLD, UNSOLD, LEADERBOARD */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10">
            {(["UPCOMING", "SOLD", "UNSOLD", "LEADERBOARD"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition ${
                  filterTab === tab
                    ? "bg-gradient-to-r from-orange to-amber-500 text-black shadow-md"
                    : "text-muted hover:text-white"
                }`}
              >
                {tab}
                {tab === "UPCOMING" && ` (${upcomingPlayers.length})`}
                {tab === "SOLD" && ` (${soldPlayers.length})`}
                {tab === "UNSOLD" && ` (${unsoldPlayers.length})`}
              </button>
            ))}
          </div>

          {/* Search box */}
          {filterTab !== "LEADERBOARD" && (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search superstar or role..."
              className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs text-white focus:outline-none focus:border-orange w-48 sm:w-64"
            />
          )}
        </div>

        {/* Roster Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {filterTab === "LEADERBOARD" ? (
            /* Leaderboard Tab */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 cols: Top Sold Signings */}
              <div className="lg:col-span-7 bg-[#111624] border border-white/10 rounded-2xl p-5 shadow-xl">
                <h3 className="font-display text-2xl text-yellow mb-4">
                  Top Expensive Signings ({allSoldPurchases.length})
                </h3>
                {allSoldPurchases.length === 0 ? (
                  <p className="text-xs text-muted py-6 text-center">No players sold yet in this auction.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {allSoldPurchases.map((purchase, idx) => {
                      const photoUrl = getPlayerImageUrl(purchase.player.name);
                      return (
                        <div
                          key={purchase.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-sm font-bold text-muted w-5">
                              #{idx + 1}
                            </span>
                            {photoUrl ? (
                              <img
                                src={photoUrl}
                                alt={purchase.player.name}
                                className="w-10 h-10 rounded-lg object-contain object-bottom border border-white/10 bg-black/40"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white font-display">
                                {purchase.player.name.replace(/\s*\([^)]*\)/g, "").trim().slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                                {purchase.player.name}
                              </h4>
                              <p className="text-[11px] text-muted">
                                <span className="uppercase text-blue-400 font-semibold">{purchase.player.role}</span> •{" "}
                                <strong style={{ color: purchase.colorPrimary }}>
                                  {purchase.teamName}
                                </strong>
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <span className="font-mono text-sm sm:text-base font-black text-orange">
                              {formatPurse(purchase.soldPrice)}
                            </span>
                            <span className="block text-[10px] text-muted font-mono">
                              Base: {formatPurse(purchase.basePrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right 5 cols: Franchise Squad Standings */}
              <div className="lg:col-span-5 bg-[#111624] border border-white/10 rounded-2xl p-5 shadow-xl">
                <h3 className="font-display text-2xl text-white mb-4">
                  Franchise Roster Standings
                </h3>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {teamLeaderboard.map((team, idx) => {
                    const spent = team.initialPurse - team.currentPurse;
                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono text-xs font-bold text-muted w-4">
                            {idx + 1}
                          </span>
                          <TeamBadge
                            name={team.name}
                            logoUrl={team.logoUrl}
                            color={team.colorPrimary}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-white truncate">{team.name}</h4>
                            <span className="text-[10px] text-muted">
                              Bought: <strong className="text-white">{team.purchases.length}</strong> • Spent: {formatPurse(spent)}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono text-xs font-bold text-yellow-400">
                          {formatPurse(team.currentPurse)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Upcoming, Sold, Unsold Grid */
            sections.map((sec, secIdx) => (
              <div key={secIdx} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs tracking-wider uppercase">
                    {sec.title}
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {sec.items.length === 0 ? (
                  <p className="text-xs text-muted py-4">No players found in this category.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                    {sec.items.map((player) => {
                      const isCurrent = player.id === currentLotPlayerId;
                      const purchase = purchaseMap.get(player.id);
                      const photoUrl = getPlayerImageUrl(player.name);

                      return (
                        <div
                          key={player.id}
                          className={`group relative rounded-2xl p-3 flex flex-col justify-between items-center text-center transition-all duration-200 border ${
                            isCurrent
                              ? "bg-orange/15 border-orange shadow-[0_0_20px_rgba(255,107,0,0.3)]"
                              : "bg-[#111624] border-white/10 hover:border-white/30 hover:bg-[#141B2D]"
                          }`}
                        >
                          {/* PKL Auction Badge or Real Photo */}
                          <PlayerRosterThumb name={player.name} />

                          {/* Player Name */}
                          <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1 leading-tight">
                            {player.name.replace(/\s*\([^)]*\)/g, "")}
                          </h4>

                          {/* Role pill */}
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted mt-1 block">
                            {player.role}
                          </span>

                          {/* Price / Sold Banner */}
                          <div className="w-full mt-2.5 pt-2 border-t border-white/10">
                            {purchase ? (
                              <div className="flex flex-col items-center">
                                <span className="font-mono text-xs font-black text-emerald-400">
                                  {formatPurse(purchase.soldPrice)}
                                </span>
                                <span
                                  className="text-[10px] font-bold truncate max-w-[120px] mt-0.5"
                                  style={{ color: purchase.colorPrimary }}
                                >
                                  {purchase.teamName}
                                </span>
                              </div>
                            ) : player.status === "UNSOLD" ? (
                              <span className="text-[11px] font-bold text-red uppercase">
                                UNSOLD
                              </span>
                            ) : (
                              <span className="font-mono text-xs font-bold text-orange">
                                {formatPurse(player.basePrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
