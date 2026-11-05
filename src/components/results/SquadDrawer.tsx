"use client";

import { TeamBadge } from "@/components/TeamBadge";
import { PlayerAvatar } from "@/components/auction/PlayerAvatar";
import { formatPurse } from "@/lib/money";
import type { TeamScoreResult } from "@/lib/scoring/auctionScoring";

export function SquadDrawer({
  team,
  onClose,
}: {
  team: TeamScoreResult | null;
  onClose: () => void;
}) {
  if (!team) return null;

  const raiders = team.purchases.filter((p) => p.role === "raider");
  const defenders = team.purchases.filter((p) => p.role === "defender");
  const allRounders = team.purchases.filter((p) => p.role === "allRounder");

  const groups = [
    { title: "Raiders", items: raiders, color: "text-orange", count: team.roleCounts.raider },
    { title: "Defenders", items: defenders, color: "text-blue-400", count: team.roleCounts.defender },
    { title: "All-Rounders", items: allRounders, color: "text-yellow", count: team.roleCounts.allRounder },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-card border-l border-white/10 flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <TeamBadge
              name={team.teamName}
              logoUrl={team.logoUrl}
              color={team.colorPrimary}
            />
            <div>
              <h3 className="font-display text-2xl text-white">{team.teamName}</h3>
              <p className="text-xs text-muted">
                {team.eligible && team.rank ? `Rank #${team.rank} • ` : "Ineligible • "}
                Score: <strong className="text-yellow">{team.finalScore.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:text-white hover:bg-white/10 transition"
            aria-label="Close squad drawer"
          >
            ✕
          </button>
        </div>

        {/* Purse and Squad stats */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="rounded-lg bg-background p-3 border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-muted">Total Spent</span>
            <p className="font-mono font-bold text-sm text-orange">{formatPurse(team.totalSpent)}</p>
          </div>
          <div className="rounded-lg bg-background p-3 border border-white/5">
            <span className="text-[10px] uppercase tracking-wider text-muted">Remaining Purse</span>
            <p className="font-mono font-bold text-sm text-white">{formatPurse(team.remainingPurse)}</p>
          </div>
        </div>

        {/* Ineligibility reasons if any */}
        {!team.eligible && team.ineligibilityReasons.length > 0 && (
          <div className="mb-4 rounded-lg bg-red/10 border border-red/30 p-3 text-xs text-red space-y-1">
            <p className="font-bold">Ineligibility Violations:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {team.ineligibilityReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Player Roster by Role */}
        <div className="space-y-6 flex-1">
          {groups.map((grp) => (
            <div key={grp.title} className="space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-white/5 pb-1">
                <span className={`font-bold uppercase tracking-wider ${grp.color}`}>
                  {grp.title} ({grp.count})
                </span>
                <span className="text-[10px] text-muted">
                  Top slots counted in score
                </span>
              </div>

              {grp.items.length === 0 ? (
                <p className="text-xs text-muted italic">No players in this role</p>
              ) : (
                <div className="space-y-1.5">
                  {grp.items
                    .sort((a, b) => b.rating - a.rating)
                    .map((player) => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between rounded-lg bg-background/60 p-2 text-xs border border-white/5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <PlayerAvatar name={player.name} role={player.role} size="sm" />
                          <div className="truncate">
                            <p className="font-medium text-white truncate">{player.name}</p>
                            <p className="text-[10px] text-muted">
                              Base: {formatPurse(player.basePrice)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold text-white text-[10px]">
                            Rating {player.rating}
                          </span>
                          <p className="font-mono font-bold text-orange text-[11px] mt-0.5">
                            {formatPurse(player.soldPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-white hover:bg-white/20 transition"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
