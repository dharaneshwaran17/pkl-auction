import type { ScoringConfig } from "@/lib/scoring/auctionScoring.config";

export function ScoreBreakdownModal({
  config,
  onClose,
}: {
  config: ScoringConfig;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-display text-2xl text-yellow">
              Scoring Formula & Squad Rules
            </h3>
            <p className="text-xs text-muted">
              Rules version: <span className="text-white font-mono">{config.version}</span> • Verified immutable server snapshot
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:text-white hover:bg-white/10"
            aria-label="Close formula modal"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 my-4 text-xs">
          {/* Formula weights */}
          <div className="rounded-xl border border-white/10 bg-background/60 p-4">
            <h4 className="font-bold text-sm text-orange uppercase tracking-wider mb-2">
              1. Final Strength Formula
            </h4>
            <p className="text-muted leading-relaxed">
              Final Score = (30% × Raider Strength) + (30% × Defender Strength) + (20% × All-Rounder Strength) + (15% × Balance & Completeness) + (5% × Purse Efficiency).
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3 text-center">
              <div className="rounded bg-white/5 p-2">
                <span className="text-[10px] text-muted block">Raiders</span>
                <strong className="text-white text-sm">30%</strong>
              </div>
              <div className="rounded bg-white/5 p-2">
                <span className="text-[10px] text-muted block">Defenders</span>
                <strong className="text-white text-sm">30%</strong>
              </div>
              <div className="rounded bg-white/5 p-2">
                <span className="text-[10px] text-muted block">All-Rounders</span>
                <strong className="text-white text-sm">20%</strong>
              </div>
              <div className="rounded bg-white/5 p-2">
                <span className="text-[10px] text-muted block">Balance</span>
                <strong className="text-white text-sm">15%</strong>
              </div>
              <div className="rounded bg-white/5 p-2">
                <span className="text-[10px] text-muted block">Purse Reserve</span>
                <strong className="text-white text-sm">5%</strong>
              </div>
            </div>
          </div>

          {/* Role Strength calculation */}
          <div className="rounded-xl border border-white/10 bg-background/60 p-4">
            <h4 className="font-bold text-sm text-yellow uppercase tracking-wider mb-2">
              2. Position Strength (Top N Counted Slots)
            </h4>
            <p className="text-muted leading-relaxed">
              Strength measures the top starters in each department:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-muted">
              <li>
                <strong className="text-white">Raiders:</strong> Top {config.countedSlots.raider} players counted out of max rating ({config.ratingScale.max}).
              </li>
              <li>
                <strong className="text-white">Defenders:</strong> Top {config.countedSlots.defender} players counted.
              </li>
              <li>
                <strong className="text-white">All-Rounders:</strong> Top {config.countedSlots.allRounder} players counted.
              </li>
              <li>Missing starting slots receive 0 points.</li>
            </ul>
          </div>

          {/* Squad Eligibility Requirements */}
          <div className="rounded-xl border border-white/10 bg-background/60 p-4">
            <h4 className="font-bold text-sm text-red uppercase tracking-wider mb-2">
              3. Mandatory Eligibility Rules
            </h4>
            <p className="text-muted mb-2">
              Any team failing these conditions receives an indicative score only and cannot be crowned winner:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li>Squad size must be between {config.squadRules.minSize} and {config.squadRules.maxSize} players (ideal {config.squadRules.idealSize}).</li>
              <li>Minimum role limits: At least {config.squadRules.minPerRole.raider} Raiders, {config.squadRules.minPerRole.defender} Defenders, {config.squadRules.minPerRole.allRounder} All-Rounder.</li>
              <li>Budget limit: Total player spend cannot exceed initial purse.</li>
              <li>Player uniqueness: No player may be duplicated across squads.</li>
            </ul>
          </div>

          {/* Tie breakers */}
          <div className="rounded-xl border border-white/10 bg-background/60 p-4">
            <h4 className="font-bold text-sm text-white uppercase tracking-wider mb-2">
              4. Deterministic Tie-Breakers
            </h4>
            <ol className="list-decimal pl-5 space-y-1 text-muted">
              <li>Highest Balance & Completeness category score.</li>
              <li>Highest sum of ratings across all purchased squad members.</li>
              <li>If still tied, positions are shared equally (e.g. 1, 1, 3).</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="rounded-lg bg-orange px-6 py-2 text-sm font-bold text-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
