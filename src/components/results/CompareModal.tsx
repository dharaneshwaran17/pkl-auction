"use client";

import { useState } from "react";
import { TeamBadge } from "@/components/TeamBadge";
import { formatPurse } from "@/lib/money";
import type { TeamScoreResult } from "@/lib/scoring/auctionScoring";

export function CompareModal({
  teams,
  onClose,
}: {
  teams: TeamScoreResult[];
  onClose: () => void;
}) {
  const [team1Id, setTeam1Id] = useState<string>(teams[0]?.teamId ?? "");
  const [team2Id, setTeam2Id] = useState<string>(teams[1]?.teamId ?? "");
  const [team3Id, setTeam3Id] = useState<string>("");

  const t1 = teams.find((t) => t.teamId === team1Id);
  const t2 = teams.find((t) => t.teamId === team2Id);
  const t3 = teams.find((t) => t.teamId === team3Id);

  const selectedTeams = [t1, t2, t3].filter((t): t is TeamScoreResult => t != null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-display text-2xl text-yellow">Compare Squads</h3>
            <p className="text-xs text-muted">
              Select 2 or 3 teams to view a detailed side-by-side head-to-head breakdown.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:text-white hover:bg-white/10"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Team Selectors */}
        <div className="grid gap-3 sm:grid-cols-3 my-4">
          <div>
            <label className="text-xs text-muted block mb-1">Team 1</label>
            <select
              value={team1Id}
              onChange={(e) => setTeam1Id(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white"
            >
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Team 2</label>
            <select
              value={team2Id}
              onChange={(e) => setTeam2Id(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white"
            >
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">Team 3 (Optional)</label>
            <select
              value={team3Id}
              onChange={(e) => setTeam3Id(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-white"
            >
              <option value="">-- None --</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-side Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-3 text-muted uppercase">Metric</th>
                {selectedTeams.map((t) => (
                  <th key={t.teamId} className="p-3">
                    <div className="flex items-center gap-2">
                      <TeamBadge name={t.teamName} logoUrl={t.logoUrl} color={t.colorPrimary} />
                      <span className="font-bold text-white text-sm">{t.teamName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              <tr>
                <td className="p-3 text-muted font-sans font-medium">Rank & Eligibility</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3">
                    {t.eligible ? (
                      <span className="font-bold text-yellow font-sans">Rank #{t.rank}</span>
                    ) : (
                      <span className="rounded bg-red/20 px-2 py-0.5 text-red font-sans font-bold">
                        Ineligible
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="bg-white/5">
                <td className="p-3 text-white font-sans font-bold">Final Squad Strength</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3 text-base font-bold text-yellow">
                    {t.finalScore.toFixed(2)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-muted font-sans">Raider Strength (30%)</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3">
                    {t.categoryScores.raider.toFixed(1)} / 100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-muted font-sans">Defender Strength (30%)</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3">
                    {t.categoryScores.defender.toFixed(1)} / 100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-muted font-sans">All-Rounder Strength (20%)</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3">
                    {t.categoryScores.allRounder.toFixed(1)} / 100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-muted font-sans">Balance & Completeness (15%)</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3">
                    {t.categoryScores.balance.toFixed(1)} / 100
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-muted font-sans">Purse Efficiency (5%)</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3">
                    {t.categoryScores.purse.toFixed(1)} / 100
                  </td>
                ))}
              </tr>
              <tr className="bg-white/5">
                <td className="p-3 text-muted font-sans">Squad Composition</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3 font-sans">
                    <strong>{t.playersBought}</strong> players ({t.roleCounts.raider}R,{" "}
                    {t.roleCounts.defender}D, {t.roleCounts.allRounder}A)
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-muted font-sans">Total Spent</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3 text-orange font-bold">
                    {formatPurse(t.totalSpent)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 text-muted font-sans">Remaining Purse</td>
                {selectedTeams.map((t) => (
                  <td key={t.teamId} className="p-3 text-white">
                    {formatPurse(t.remainingPurse)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-orange px-6 py-2 text-sm font-bold text-black"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
