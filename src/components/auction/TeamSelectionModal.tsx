"use client";

import React, { useState } from "react";
import { TeamBadge } from "@/components/TeamBadge";
import { formatPurse } from "@/lib/money";
import type { AuctionTeam, AuctionUser } from "./LiveAuctionRoom";

interface TeamSelectionModalProps {
  teams: AuctionTeam[];
  me: AuctionUser | null;
  currentTeamId?: string | null;
  isOpen: boolean;
  onSelectTeam: (teamId: string, coachName: string) => Promise<void>;
  onClose?: () => void;
  canClose?: boolean;
}

export function TeamSelectionModal({
  teams,
  me,
  currentTeamId,
  isOpen,
  onSelectTeam,
  onClose,
  canClose = false,
}: TeamSelectionModalProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(
    currentTeamId ?? teams.find((t) => !t.ownerId)?.id ?? teams[0]?.id ?? null
  );
  const [coachName, setCoachName] = useState<string>(
    me?.name?.replace(/\s*\((You|Host)\)/g, "").trim() || "Coach"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  async function handleConfirm() {
    if (!selectedTeamId) {
      setError("Please select a franchise to continue.");
      return;
    }
    const trimmed = coachName.trim();
    if (!trimmed) {
      setError("Please enter your coach/manager name.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSelectTeam(selectedTeamId, trimmed);
    } catch (err) {
      setError((err as Error).message || "Failed to claim franchise");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-[#0F1422] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-orange/10 via-amber-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange/20 border border-orange/40 flex items-center justify-center text-xl shadow-inner">
              🏆
            </div>
            <div>
              <h2 className="font-display text-2xl font-black text-white tracking-wider">
                CHOOSE YOUR PKL FRANCHISE
              </h2>
              <p className="text-xs text-muted font-medium">
                Pick your team and enter your coach name to join the live auction
              </p>
            </div>
          </div>
          {canClose && onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted hover:text-white transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Coach Name Input */}
        <div className="p-5 pb-3 border-b border-white/5 bg-[#141A2B]/60">
          <label className="block text-[11px] font-black uppercase text-muted tracking-wider mb-1.5">
            YOUR COACH / MANAGER NAME
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={30}
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="e.g. Dharaneshwaran, Rahul, Coach Vijay..."
              className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-orange transition placeholder:text-muted/50"
            />
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono font-bold text-muted">
              {coachName.trim().length}/30
            </div>
          </div>
        </div>

        {/* Franchises Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted">
              SELECT AN AVAILABLE FRANCHISE ({teams.filter((t) => !t.ownerId || t.ownerId === me?.id).length} Available)
            </span>
            <span className="text-[10px] text-muted">Purse: ₹10.00 Cr each</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {teams.map((team) => {
              const isClaimedByMe = team.ownerId && team.ownerId === me?.id;
              const isClaimedByOther = team.ownerId && team.ownerId !== me?.id;
              const isSelected = selectedTeamId === team.id;

              return (
                <div
                  key={team.id}
                  onClick={() => {
                    if (!isClaimedByOther) {
                      setSelectedTeamId(team.id);
                      setError(null);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                    isClaimedByOther
                      ? "opacity-40 bg-white/[0.02] border-white/5 cursor-not-allowed"
                      : isSelected
                      ? "bg-white/10 border-orange shadow-[0_0_20px_rgba(255,107,0,0.25)] cursor-pointer scale-[1.01]"
                      : "bg-white/[0.04] border-white/10 hover:border-white/25 hover:bg-white/[0.06] cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamBadge
                      name={team.name}
                      logoUrl={team.logoUrl}
                      color={team.colorPrimary}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate leading-tight">
                        {team.name}
                      </h4>
                      <p className="text-[11px] font-mono font-semibold text-muted mt-0.5">
                        {formatPurse(team.currentPurse)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isClaimedByMe ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold">
                        Your Team
                      </span>
                    ) : isClaimedByOther ? (
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted text-[10px] font-medium truncate max-w-[100px] block" title={`Taken by ${team.owner?.name ?? "Other"}`}>
                        🔒 {team.owner?.name ? team.owner.name.split(" ")[0] : "Taken"}
                      </span>
                    ) : isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-orange flex items-center justify-center text-black text-xs font-black">
                        ✓
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-muted hover:text-white uppercase">
                        Select
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Button Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0A0E18] flex items-center justify-between gap-3">
          <div className="min-w-0 hidden sm:block">
            {selectedTeam ? (
              <p className="text-xs text-white truncate">
                Selected: <strong className="text-orange">{selectedTeam.name}</strong>
              </p>
            ) : (
              <p className="text-xs text-muted">No team selected</p>
            )}
          </div>

          <button
            disabled={!selectedTeamId || submitting}
            onClick={() => void handleConfirm()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange to-amber-500 text-black font-black text-sm uppercase tracking-wider shadow-[0_4px_20px_rgba(255,107,0,0.35)] hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span>CLAIMING FRANCHISE...</span>
            ) : (
              <span>ENTER AUCTION AS {selectedTeam ? selectedTeam.name.toUpperCase() : "COACH"} →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
