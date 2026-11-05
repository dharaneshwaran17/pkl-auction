import { formatPurse } from "@/lib/money";
import type { AwardPlayer } from "@/lib/scoring/auctionScoring";

const AWARDS_CONFIG = [
  {
    key: "bestRaider" as const,
    title: "Best Raider",
    icon: "⚡",
    subtitle: "Highest rating among sold raiders",
    gradient: "from-orange/20 to-transparent",
  },
  {
    key: "bestDefender" as const,
    title: "Best Defender",
    icon: "🛡️",
    subtitle: "Highest rating among sold defenders",
    gradient: "from-blue-500/20 to-transparent",
  },
  {
    key: "bestAllRounder" as const,
    title: "Best All-Rounder",
    icon: "⚔️",
    subtitle: "Highest rating among sold all-rounders",
    gradient: "from-yellow/20 to-transparent",
  },
  {
    key: "mostExpensive" as const,
    title: "Most Expensive Player",
    icon: "💎",
    subtitle: "Highest confirmed purchase price",
    gradient: "from-purple-500/20 to-transparent",
  },
  {
    key: "bestValue" as const,
    title: "Best-Value Purchase",
    icon: "🎯",
    subtitle: "Highest rating ÷ (sold ÷ base price) (Rating ≥ 70)",
    gradient: "from-emerald-500/20 to-transparent",
  },
];

export function AwardsSection({
  awards,
}: {
  awards: {
    bestRaider: AwardPlayer | null;
    bestDefender: AwardPlayer | null;
    bestAllRounder: AwardPlayer | null;
    mostExpensive: AwardPlayer | null;
    bestValue: AwardPlayer | null;
  };
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl tracking-wide text-yellow">
          Auction Awards
        </h2>
        <span className="text-xs uppercase tracking-wider text-muted">
          Individual Excellence
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {AWARDS_CONFIG.map((cfg) => {
          const player = awards[cfg.key];
          return (
            <div
              key={cfg.key}
              className={`flex flex-col justify-between rounded-xl border border-white/10 bg-gradient-to-b ${cfg.gradient} bg-card p-4 transition-transform hover:-translate-y-1`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl" role="img" aria-label={cfg.title}>
                    {cfg.icon}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Award
                  </span>
                </div>
                <h3 className="mt-2 font-display text-xl text-white tracking-wide">
                  {cfg.title}
                </h3>
                <p className="text-[11px] text-muted line-clamp-1">{cfg.subtitle}</p>
              </div>

              {player ? (
                <div className="mt-4 border-t border-white/10 pt-3">
                  <p className="font-bold text-base text-yellow leading-tight">
                    {player.name}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Team: <strong className="text-white">{player.teamName}</strong>
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold text-white">
                      Rating: {player.rating}
                    </span>
                    <span className="font-mono font-bold text-orange">
                      {formatPurse(player.soldPrice)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 border-t border-white/10 pt-3 text-xs text-muted italic">
                  No eligible player
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
