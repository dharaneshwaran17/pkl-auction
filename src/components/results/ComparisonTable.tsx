"use client";

import { useState } from "react";
import { TeamBadge } from "@/components/TeamBadge";
import { formatPurse } from "@/lib/money";
import type { TeamScoreResult } from "@/lib/scoring/auctionScoring";

type SortKey =
  | "rank"
  | "teamName"
  | "finalScore"
  | "raider"
  | "defender"
  | "allRounder"
  | "balance"
  | "purse"
  | "playersBought"
  | "totalSpent"
  | "remainingPurse";

export function ComparisonTable({
  teams,
  onSelectSquad,
}: {
  teams: TeamScoreResult[];
  onSelectSquad: (team: TeamScoreResult) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "teamName");
    }
  }

  const sorted = [...teams].sort((a, b) => {
    let diff = 0;
    switch (sortKey) {
      case "rank":
        // Eligible ranked first, ineligibles last
        if (a.eligible && !b.eligible) return -1;
        if (!a.eligible && b.eligible) return 1;
        diff = (a.rank ?? 999) - (b.rank ?? 999);
        break;
      case "teamName":
        diff = a.teamName.localeCompare(b.teamName);
        break;
      case "finalScore":
        diff = a.finalScore - b.finalScore;
        break;
      case "raider":
        diff = a.categoryScores.raider - b.categoryScores.raider;
        break;
      case "defender":
        diff = a.categoryScores.defender - b.categoryScores.defender;
        break;
      case "allRounder":
        diff = a.categoryScores.allRounder - b.categoryScores.allRounder;
        break;
      case "balance":
        diff = a.categoryScores.balance - b.categoryScores.balance;
        break;
      case "purse":
        diff = a.categoryScores.purse - b.categoryScores.purse;
        break;
      case "playersBought":
        diff = a.playersBought - b.playersBought;
        break;
      case "totalSpent":
        diff = a.totalSpent - b.totalSpent;
        break;
      case "remainingPurse":
        diff = a.remainingPurse - b.remainingPurse;
        break;
    }
    return sortAsc ? diff : -diff;
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-3xl tracking-wide text-yellow">
            Team Comparison Table
          </h2>
          <p className="text-xs text-muted">
            Click any column header to sort teams by strength metrics, role depth, or purse efficiency.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-card">
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="border-b border-white/10 bg-white/5 font-semibold text-muted uppercase tracking-wider">
            <tr>
              <th
                onClick={() => handleSort("rank")}
                className="cursor-pointer px-4 py-3 hover:text-white"
              >
                Rank {sortKey === "rank" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("teamName")}
                className="cursor-pointer px-4 py-3 hover:text-white"
              >
                Team {sortKey === "teamName" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("finalScore")}
                className="cursor-pointer px-4 py-3 text-right hover:text-white"
              >
                Score {sortKey === "finalScore" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("raider")}
                className="cursor-pointer px-3 py-3 text-right hover:text-white"
              >
                Raiders (30%) {sortKey === "raider" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("defender")}
                className="cursor-pointer px-3 py-3 text-right hover:text-white"
              >
                Defenders (30%) {sortKey === "defender" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("allRounder")}
                className="cursor-pointer px-3 py-3 text-right hover:text-white"
              >
                All-Round (20%) {sortKey === "allRounder" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("balance")}
                className="cursor-pointer px-3 py-3 text-right hover:text-white"
              >
                Balance (15%) {sortKey === "balance" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("purse")}
                className="cursor-pointer px-3 py-3 text-right hover:text-white"
              >
                Purse (5%) {sortKey === "purse" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("playersBought")}
                className="cursor-pointer px-3 py-3 text-center hover:text-white"
              >
                Squad (R/D/A) {sortKey === "playersBought" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("totalSpent")}
                className="cursor-pointer px-4 py-3 text-right hover:text-white"
              >
                Spent {sortKey === "totalSpent" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th
                onClick={() => handleSort("remainingPurse")}
                className="cursor-pointer px-4 py-3 text-right hover:text-white"
              >
                Remaining {sortKey === "remainingPurse" ? (sortAsc ? "▲" : "▼") : ""}
              </th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((team) => (
              <tr
                key={team.teamId}
                className={`hover:bg-white/5 transition-colors ${
                  !team.eligible ? "opacity-75 bg-red/5" : ""
                }`}
              >
                <td className="px-4 py-3 font-bold font-mono">
                  {team.eligible && team.rank ? (
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                        team.rank === 1
                          ? "bg-yellow text-black font-extrabold"
                          : team.rank === 2
                          ? "bg-slate-300 text-black font-bold"
                          : team.rank === 3
                          ? "bg-amber-700 text-white font-bold"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {team.rank}
                    </span>
                  ) : (
                    <span className="rounded bg-red/20 px-1.5 py-0.5 text-[10px] font-bold text-red uppercase">
                      Ineligible
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="scale-75 origin-left">
                      <TeamBadge
                        name={team.teamName}
                        logoUrl={team.logoUrl}
                        color={team.colorPrimary}
                      />
                    </div>
                    <div>
                      <span className="font-semibold text-white">{team.teamName}</span>
                      {!team.eligible && team.ineligibilityReasons.length > 0 && (
                        <p className="text-[10px] text-red line-clamp-1 max-w-xs">
                          {team.ineligibilityReasons[0]}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-sm text-yellow">
                  {team.finalScore.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {team.categoryScores.raider.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {team.categoryScores.defender.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {team.categoryScores.allRounder.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {team.categoryScores.balance.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  {team.categoryScores.purse.toFixed(1)}
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="font-bold text-white">{team.playersBought}</span>{" "}
                  <span className="text-[10px] text-muted">
                    ({team.roleCounts.raider}/{team.roleCounts.defender}/
                    {team.roleCounts.allRounder})
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-muted">
                  {formatPurse(team.totalSpent)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                  {formatPurse(team.remainingPurse)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onSelectSquad(team)}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-muted hover:border-orange hover:text-white transition"
                  >
                    Squad
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
