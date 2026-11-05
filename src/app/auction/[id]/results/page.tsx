"use client";

import { useEffect, useState, use, Suspense } from "react";
import Link from "next/link";
import { AnnouncementSequence } from "@/components/results/AnnouncementSequence";
import { AwardsSection } from "@/components/results/AwardsSection";
import { ComparisonTable } from "@/components/results/ComparisonTable";
import { ComparisonCharts } from "@/components/results/ComparisonCharts";
import { SquadDrawer } from "@/components/results/SquadDrawer";
import { CompareModal } from "@/components/results/CompareModal";
import { ScoreBreakdownModal } from "@/components/results/ScoreBreakdownModal";
import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/auction/PlayerAvatar";
import { formatPurse } from "@/lib/money";
import type { AuctionScoreResult, TeamScoreResult } from "@/lib/scoring/auctionScoring";
import type { ScoringConfig } from "@/lib/scoring/auctionScoring.config";

function ResultsPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    auctionId: string;
    code?: string;
    auctionName?: string;
    teamOwners?: Array<{ id: string; name: string; owner?: { id: string; name: string } | null }>;
    status: string;
    scoringConfigVersion: string;
    scoringConfigSnapshot: ScoringConfig;
    resultSnapshot: AuctionScoreResult;
    calculatedAt: string;
    integrityWarnings: string[];
  } | null>(null);

  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [selectedSquad, setSelectedSquad] = useState<TeamScoreResult | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Tab State matching Image 2
  const [activeTab, setActiveTab] = useState<"squads" | "expensive" | "ratings">("squads");
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  async function loadResults() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auctions/${id}/results`);
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("This auction has not been completed yet. The host must end the auction first.");
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to load results");
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResults();
  }, [id]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center p-6 bg-[#0B0E17]">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-orange border-t-transparent mb-4" />
        <h2 className="font-display text-3xl text-yellow">Calculating Best Auction Squad...</h2>
        <p className="text-xs text-muted mt-2">Running deterministic valuation audits</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center p-6 text-center bg-[#0B0E17]">
        <div className="rounded-full bg-red/10 p-4 text-3xl mb-3">⚠️</div>
        <h2 className="font-display text-3xl text-white">Results Notice</h2>
        <p className="mt-2 text-sm text-red">{error ?? "Unable to display auction results."}</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => void loadResults()}
            className="rounded-lg bg-orange px-5 py-2 font-semibold text-black"
          >
            Retry
          </button>
          <Link
            href={`/auction/${id}`}
            className="rounded-lg border border-white/20 px-5 py-2 font-semibold text-white hover:bg-white/10"
          >
            Go to Auction Room
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-white/5 px-5 py-2 text-sm text-muted hover:text-white"
          >
            Home
          </Link>
        </div>
      </main>
    );
  }

  const { resultSnapshot, scoringConfigSnapshot } = data;
  const eligibleTeams = resultSnapshot.teams.filter((t) => t.eligible);
  const ineligibleTeams = resultSnapshot.teams.filter((t) => !t.eligible);
  const winners = eligibleTeams.filter((t) => t.rank === 1);
  const primaryWinner = winners[0];
  const runnerUp = eligibleTeams.find((t) => t.rank === 2);

  // Top Expensive Purchases
  const allPurchases = resultSnapshot.teams
    .flatMap((team) =>
      team.purchases.map((purchase) => ({
        ...purchase,
        teamName: team.teamName,
        teamLogo: team.logoUrl,
        colorPrimary: team.colorPrimary,
      }))
    )
    .sort((a, b) => b.soldPrice - a.soldPrice);

  return (
    <div className="min-h-screen bg-[#0A0D16] text-[#E2E8F0] pb-24 font-sans select-none">
      {/* Announcement Sequence modal (shown once) */}
      {showAnnouncement && (
        <AnnouncementSequence
          auctionId={id}
          result={resultSnapshot}
          onComplete={() => setShowAnnouncement(false)}
        />
      )}

      {/* Top Header Bar matching Image 2 */}
      <header className="h-16 w-full px-6 flex items-center justify-between border-b border-white/5 bg-[#0A0D16]">
        {/* Left: ID badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono font-bold tracking-widest text-orange">
            ID: {data.code ?? id.slice(0, 6).toUpperCase()}
          </div>
        </div>

        {/* Right: Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/10 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>MENU</span>
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#121828] p-1.5 shadow-2xl z-30 animate-in fade-in"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <Link
                href={`/auction/${id}`}
                className="block rounded-lg px-3 py-2 text-xs text-white hover:bg-white/10 transition"
              >
                🏟 Back to Auction Room
              </Link>
              <a
                href={`/api/auctions/${id}/results/summary.csv`}
                download
                className="block rounded-lg px-3 py-2 text-xs text-muted hover:bg-white/10 hover:text-white transition"
              >
                📊 Download Summary CSV
              </a>
              <a
                href={`/api/auctions/${id}/results/squads.csv`}
                download
                className="block rounded-lg px-3 py-2 text-xs text-muted hover:bg-white/10 hover:text-white transition"
              >
                👥 Download Squads CSV
              </a>
              <button
                onClick={() => {
                  setShowFormula(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-xs text-muted hover:bg-white/10 hover:text-white transition"
              >
                📐 Scoring Formula Rules
              </button>
              <button
                onClick={() => {
                  setShowCompare(true);
                  setMenuOpen(false);
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-xs text-muted hover:bg-white/10 hover:text-white transition"
              >
                ⚖ Compare Teams Side-by-Side
              </button>
              <Link
                href="/"
                className="block rounded-lg px-3 py-2 text-xs text-muted hover:bg-white/10 hover:text-white transition border-t border-white/10 mt-1"
              >
                🏠 Home
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 space-y-8">
        {/* Massive Hero Heading (Image 2 match: AUCTION COMPLETE) */}
        <div className="text-center space-y-2">
          <h1 className="font-display text-5xl sm:text-7xl font-black tracking-wide text-white">
            AUCTION <span className="text-orange">COMPLETE</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Pro Kabaddi League 2026 • Official Best Auction Squad Rankings
          </p>
        </div>

        {/* 3 Pill Tabs Selector (Image 2 match) */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 rounded-full bg-[#121828] border border-white/10 gap-1 shadow-xl">
            <button
              onClick={() => setActiveTab("squads")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition ${
                activeTab === "squads"
                  ? "bg-gradient-to-r from-orange to-amber-500 text-black shadow-lg"
                  : "text-muted hover:text-white"
              }`}
            >
              <span>👥</span>
              <span>TEAM SQUADS</span>
            </button>

            <button
              onClick={() => setActiveTab("expensive")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition ${
                activeTab === "expensive"
                  ? "bg-gradient-to-r from-orange to-amber-500 text-black shadow-lg"
                  : "text-muted hover:text-white"
              }`}
            >
              <span>🏆</span>
              <span>TOP EXPENSIVE</span>
            </button>

            <button
              onClick={() => setActiveTab("ratings")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition ${
                activeTab === "ratings"
                  ? "bg-gradient-to-r from-orange to-amber-500 text-black shadow-lg"
                  : "text-muted hover:text-white"
              }`}
            >
              <span>⚡</span>
              <span>SQUAD RATINGS</span>
            </button>
          </div>
        </div>

        {/* TAB 1: TEAM SQUADS (Image 2 match) */}
        {activeTab === "squads" && (
          <section className="space-y-3.5 animate-in fade-in duration-300">
            {resultSnapshot.teams.map((team) => {
              const isExpanded = expandedTeamId === team.teamId;
              const ownerInfo = data.teamOwners?.find((t) => t.id === team.teamId);
              const coachName = ownerInfo?.owner?.name ?? "AI Coach";
              const overseasCount = team.purchases.filter(
                (p) =>
                  p.name.includes("Atrachali") ||
                  p.name.includes("Shadloui") ||
                  p.name.includes("Zafardanesh") ||
                  p.name.includes("Nabibakhsh") ||
                  p.name.includes("Mirbagheri") ||
                  p.name.includes("Jabbari")
              ).length;

              return (
                <div
                  key={team.teamId}
                  className="rounded-2xl border border-white/10 bg-[#121828]/90 overflow-hidden transition-all shadow-lg hover:border-white/20"
                >
                  {/* Team Summary Row */}
                  <div
                    onClick={() => setExpandedTeamId(isExpanded ? null : team.teamId)}
                    className="p-5 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    {/* Left: Logo & Name */}
                    <div className="flex items-center gap-4 min-w-0">
                      <TeamBadge
                        name={team.teamName}
                        logoUrl={team.logoUrl}
                        color={team.colorPrimary}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3 className="font-display text-2xl sm:text-3xl font-black text-white uppercase tracking-wider truncate">
                          {team.teamName}
                        </h3>
                        <p className="text-xs text-muted uppercase tracking-wider font-semibold">
                          MANAGED BY <span className="text-white">{coachName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: PLAYERS, OVERSEAS, SPENT, Chevron */}
                    <div className="flex items-center gap-6 sm:gap-10 text-right flex-shrink-0">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-widest block">
                          PLAYERS
                        </span>
                        <div className="font-mono text-xl sm:text-2xl font-black text-white mt-0.5">
                          {team.playersBought}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest block">
                          OVERSEAS
                        </span>
                        <div className="font-mono text-xl sm:text-2xl font-black text-white mt-0.5">
                          {overseasCount}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-orange tracking-widest block">
                          SPENT
                        </span>
                        <div className="font-mono text-xl sm:text-2xl font-black text-white mt-0.5">
                          {formatPurse(team.totalSpent)}
                        </div>
                      </div>

                      <div className="text-muted hover:text-white transition pl-2">
                        <svg
                          className={`w-5 h-5 transform transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-orange" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Full Squad Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-white/5 bg-black/20 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs text-muted mb-3 font-semibold uppercase tracking-wider">
                        <span>Squad Roster ({team.purchases.length} Players)</span>
                        <span>Remaining Purse: <strong className="text-white font-mono">{formatPurse(team.remainingPurse)}</strong></span>
                      </div>

                      {team.purchases.length === 0 ? (
                        <p className="text-xs text-muted py-3 text-center">No players purchased.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {team.purchases.map((player) => (
                            <div
                              key={player.playerId}
                              className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <PlayerAvatar name={player.name} role={player.role} size="sm" />
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs text-white truncate leading-tight">
                                    {player.name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] uppercase font-bold text-orange px-1.5 py-0.5 bg-orange/10 rounded">
                                      {player.role}
                                    </span>
                                    <span className="text-[10px] text-muted">
                                      ★ {player.rating}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="font-mono text-xs font-bold text-white text-right">
                                {formatPurse(player.soldPrice)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* TAB 2: TOP EXPENSIVE PURCHASES */}
        {activeTab === "expensive" && (
          <section className="space-y-3 animate-in fade-in duration-300">
            <div className="rounded-2xl border border-white/10 bg-[#121828] p-6 shadow-xl">
              <h2 className="font-display text-3xl font-black text-yellow tracking-wide mb-4">
                Top 15 Most Expensive Signings
              </h2>
              <div className="divide-y divide-white/5">
                {allPurchases.slice(0, 15).map((item, idx) => (
                  <div
                    key={item.playerId + idx}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-base font-black text-muted w-6">
                        #{idx + 1}
                      </span>
                      <PlayerAvatar name={item.name} role={item.role} size="md" />
                      <div>
                        <h4 className="font-bold text-sm text-white">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] uppercase font-bold text-blue-400">
                            {item.role}
                          </span>
                          <span className="text-xs text-muted">•</span>
                          <span className="text-[11px] text-muted">
                            Sold to <strong style={{ color: item.colorPrimary }}>{item.teamName}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-display text-2xl font-black text-orange">
                        {formatPurse(item.soldPrice)}
                      </div>
                      <div className="text-[10px] text-muted font-mono">
                        Base: {formatPurse(item.basePrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: SQUAD RATINGS & BEST AUCTION SQUAD RANKING */}
        {activeTab === "ratings" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Winner Summary Banner */}
            {primaryWinner && resultSnapshot.status !== "NO_ELIGIBLE_WINNER" ? (
              <section className="relative overflow-hidden rounded-3xl border border-orange/30 bg-gradient-to-r from-card via-[#161c30] to-card p-6 sm:p-8 shadow-2xl">
                <div
                  className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
                  style={{ background: primaryWinner.colorPrimary }}
                />

                <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <TeamBadge
                      name={primaryWinner.teamName}
                      logoUrl={primaryWinner.logoUrl}
                      color={primaryWinner.colorPrimary}
                    />
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-orange">
                        AUCTION CHAMPION
                      </span>
                      <h2 className="font-display text-4xl sm:text-6xl text-white tracking-wide">
                        {primaryWinner.teamName}
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-yellow max-w-xl">
                        {resultSnapshot.whyRankedFirst}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="rounded-2xl border border-white/10 bg-background/80 p-4 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted block">
                        Strength Score
                      </span>
                      <div className="font-display text-4xl text-yellow">
                        {primaryWinner.finalScore.toFixed(2)}
                      </div>
                      {runnerUp && (
                        <span className="text-[11px] text-muted">
                          +{resultSnapshot.winnerVsRunnerUp?.strengthDifference.toFixed(2)} over {runnerUp.teamName}
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-background/80 p-4 text-center">
                      <span className="text-[10px] uppercase tracking-wider text-muted block">
                        Total Spent
                      </span>
                      <div className="font-mono text-xl font-bold text-orange mt-1">
                        {formatPurse(primaryWinner.totalSpent)}
                      </div>
                      <span className="text-[11px] text-muted">
                        Left: {formatPurse(primaryWinner.remainingPurse)}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedSquad(primaryWinner)}
                      className="rounded-xl bg-orange px-5 py-4 font-display text-lg tracking-wider text-black hover:brightness-110 shadow-lg transition"
                    >
                      View Winning Squad &rarr;
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-red/30 bg-red/5 p-6 text-center">
                <h2 className="font-display text-3xl text-red">No Eligible Winner</h2>
                <p className="mt-2 text-sm text-muted max-w-lg mx-auto">
                  {resultSnapshot.statusExplanation}
                </p>
              </section>
            )}

            {/* Podium for Top 3 */}
            {eligibleTeams.length > 0 && (
              <section className="space-y-4">
                <h2 className="font-display text-3xl tracking-wide text-yellow">
                  Podium Standings
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-6">
                  {/* 2nd Place */}
                  {eligibleTeams[1] ? (
                    <div className="flex flex-col items-center order-2 sm:order-1">
                      <TeamBadge
                        name={eligibleTeams[1].teamName}
                        logoUrl={eligibleTeams[1].logoUrl}
                        color={eligibleTeams[1].colorPrimary}
                      />
                      <h3 className="mt-2 font-display text-2xl text-white text-center">
                        {eligibleTeams[1].teamName}
                      </h3>
                      <div className="w-full mt-3 rounded-t-2xl border border-white/10 bg-gradient-to-t from-card to-white/10 p-5 text-center h-44 flex flex-col justify-center">
                        <span className="font-display text-3xl text-slate-300">2nd Place</span>
                        <span className="font-mono font-bold text-xl text-yellow mt-1">
                          {eligibleTeams[1].finalScore.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setSelectedSquad(eligibleTeams[1])}
                          className="mt-3 text-xs text-muted underline hover:text-white"
                        >
                          View Squad ({eligibleTeams[1].playersBought})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block order-1" />
                  )}

                  {/* 1st Place */}
                  {eligibleTeams[0] && (
                    <div className="flex flex-col items-center order-1 sm:order-2 -mt-4">
                      <div className="text-3xl mb-1">👑</div>
                      <TeamBadge
                        name={eligibleTeams[0].teamName}
                        logoUrl={eligibleTeams[0].logoUrl}
                        color={eligibleTeams[0].colorPrimary}
                      />
                      <h3 className="mt-2 font-display text-3xl text-yellow text-center">
                        {eligibleTeams[0].teamName}
                      </h3>
                      <div className="w-full mt-3 rounded-t-2xl border-2 border-orange/40 bg-gradient-to-t from-card to-orange/20 p-6 text-center h-56 flex flex-col justify-center shadow-[0_0_40px_rgba(255,107,0,0.2)]">
                        <span className="font-display text-4xl text-yellow">1st Place</span>
                        <span className="font-mono font-extrabold text-3xl text-white mt-1">
                          {eligibleTeams[0].finalScore.toFixed(2)}
                        </span>
                        <span className="text-xs text-orange font-semibold uppercase tracking-wider mt-1">
                          Best Auction Squad
                        </span>
                        <button
                          onClick={() => setSelectedSquad(eligibleTeams[0])}
                          className="mt-3 text-xs text-white underline hover:text-orange"
                        >
                          View Champion Squad ({eligibleTeams[0].playersBought})
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {eligibleTeams[2] ? (
                    <div className="flex flex-col items-center order-3">
                      <TeamBadge
                        name={eligibleTeams[2].teamName}
                        logoUrl={eligibleTeams[2].logoUrl}
                        color={eligibleTeams[2].colorPrimary}
                      />
                      <h3 className="mt-2 font-display text-2xl text-white text-center">
                        {eligibleTeams[2].teamName}
                      </h3>
                      <div className="w-full mt-3 rounded-t-2xl border border-white/10 bg-gradient-to-t from-card to-white/5 p-4 text-center h-36 flex flex-col justify-center">
                        <span className="font-display text-2xl text-amber-700">3rd Place</span>
                        <span className="font-mono font-bold text-lg text-yellow mt-1">
                          {eligibleTeams[2].finalScore.toFixed(2)}
                        </span>
                        <button
                          onClick={() => setSelectedSquad(eligibleTeams[2])}
                          className="mt-2 text-xs text-muted underline hover:text-white"
                        >
                          View Squad ({eligibleTeams[2].playersBought})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="hidden sm:block order-3" />
                  )}
                </div>
              </section>
            )}

            {/* Awards Section */}
            <AwardsSection awards={resultSnapshot.awards} />

            {/* Comparison Table */}
            <ComparisonTable
              teams={resultSnapshot.teams}
              onSelectSquad={(t) => setSelectedSquad(t)}
            />

            {/* Recharts Charts */}
            <ComparisonCharts teams={resultSnapshot.teams} />
          </div>
        )}

        {/* Footer Note */}
        <footer className="border-t border-white/10 pt-6 text-center text-xs text-muted space-y-1">
          <p className="font-medium text-white/80">
            Best Auction Squad ranking – not the official Pro Kabaddi champion.
          </p>
          <p>
            Scoring algorithm audits roster depth, role equilibrium, and purse discipline computed purely from server records.
          </p>
        </footer>
      </main>

      {/* Squad Drawer */}
      <SquadDrawer team={selectedSquad} onClose={() => setSelectedSquad(null)} />

      {/* Compare Modal */}
      {showCompare && (
        <CompareModal
          teams={resultSnapshot.teams}
          onClose={() => setShowCompare(false)}
        />
      )}

      {/* Scoring Formula Modal */}
      {showFormula && (
        <ScoreBreakdownModal
          config={scoringConfigSnapshot}
          onClose={() => setShowFormula(false)}
        />
      )}
    </div>
  );
}

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center p-6 bg-[#0B0E17]">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-orange border-t-transparent mb-4" />
          <h2 className="font-display text-3xl text-yellow">Loading Best Auction Squad...</h2>
        </main>
      }
    >
      <ResultsPageContent params={params} />
    </Suspense>
  );
}
