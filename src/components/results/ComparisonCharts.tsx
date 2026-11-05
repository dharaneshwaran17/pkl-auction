"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { TeamScoreResult } from "@/lib/scoring/auctionScoring";
import { formatPurse } from "@/lib/money";

export function ComparisonCharts({ teams }: { teams: TeamScoreResult[] }) {
  // Allow selecting 2 to 3 teams for the Radar chart
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    teams.slice(0, 3).map((t) => t.teamId)
  );

  function toggleTeam(teamId: string) {
    if (selectedTeamIds.includes(teamId)) {
      if (selectedTeamIds.length > 1) {
        setSelectedTeamIds(selectedTeamIds.filter((id) => id !== teamId));
      }
    } else {
      if (selectedTeamIds.length < 4) {
        setSelectedTeamIds([...selectedTeamIds, teamId]);
      }
    }
  }

  // Radar Data
  const categories = [
    { key: "raider", label: "Raiders (30%)" },
    { key: "defender", label: "Defenders (30%)" },
    { key: "allRounder", label: "All-Rounders (20%)" },
    { key: "balance", label: "Balance (15%)" },
    { key: "purse", label: "Purse (5%)" },
  ];

  const radarData = categories.map((cat) => {
    const row: Record<string, string | number> = { category: cat.label };
    selectedTeamIds.forEach((id) => {
      const team = teams.find((t) => t.teamId === id);
      if (team) {
        row[team.teamName] =
          team.categoryScores[cat.key as keyof typeof team.categoryScores];
      }
    });
    return row;
  });

  // Final Scores Data
  const barData = teams
    .filter((t) => t.eligible)
    .map((t) => ({
      name: t.teamName,
      score: t.finalScore,
      fill: t.colorPrimary,
    }));

  // Purse Stacked Bar Data
  const purseData = teams.map((t) => ({
    name: t.teamName,
    spentCr: Math.round((t.totalSpent / 10_000_000) * 100) / 100,
    remainingCr: Math.round((t.remainingPurse / 10_000_000) * 100) / 100,
  }));

  const chartColors = ["#FF6B00", "#FFD400", "#2A9D8F", "#E63946"];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl tracking-wide text-yellow">
          Performance Analytics
        </h2>
        <span className="text-xs uppercase tracking-wider text-muted">
          Visual Comparisons
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar Chart: Category Breakdown */}
        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="font-display text-xl text-white">
                Category Radar Comparison
              </h3>
              <p className="text-xs text-muted">
                Pick up to 4 teams to compare strength across the 5 scoring categories:
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {teams.slice(0, 6).map((t) => {
                const isSelected = selectedTeamIds.includes(t.teamId);
                return (
                  <button
                    key={t.teamId}
                    onClick={() => toggleTeam(t.teamId)}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                      isSelected
                        ? "bg-orange text-black"
                        : "bg-white/5 text-muted hover:text-white"
                    }`}
                  >
                    {t.teamName.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#ffffff20" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fill: "#8b93a7", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "#8b93a7", fontSize: 10 }}
                />
                {selectedTeamIds.map((id, index) => {
                  const team = teams.find((t) => t.teamId === id);
                  if (!team) return null;
                  const color = chartColors[index % chartColors.length];
                  return (
                    <Radar
                      key={id}
                      name={team.teamName}
                      dataKey={team.teamName}
                      stroke={team.colorPrimary || color}
                      fill={team.colorPrimary || color}
                      fillOpacity={0.25}
                    />
                  );
                })}
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#12182a",
                    borderColor: "#ffffff20",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Overall Final Scores */}
        <div className="rounded-2xl border border-white/10 bg-card p-5">
          <h3 className="font-display text-xl text-white mb-1">
            Overall Squad Strength Scores
          </h3>
          <p className="text-xs text-muted mb-4">
            Weighted composite strength (max 100) among all eligible teams
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8b93a7", fontSize: 10 }}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis domain={[0, 100]} tick={{ fill: "#8b93a7", fontSize: 10 }} />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any) => [
                    `${typeof val === 'number' ? val.toFixed(2) : (val ?? "")} / 100`,
                    "Strength Score",
                  ]}
                  contentStyle={{
                    backgroundColor: "#12182a",
                    borderColor: "#ffffff20",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="#FF6B00" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked Bar Chart: Purse Utilization */}
        <div className="rounded-2xl border border-white/10 bg-card p-5 lg:col-span-2">
          <h3 className="font-display text-xl text-white mb-1">
            Purse Management: Spent vs Remaining (₹ in Crores)
          </h3>
          <p className="text-xs text-muted mb-4">
            Analysis of budget spent on confirmed player acquisitions vs cash in hand
          </p>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={purseData}
                margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8b93a7", fontSize: 11 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fill: "#8b93a7", fontSize: 10 }} unit=" Cr" />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(val: any, name: any) => [
                    `₹${typeof val === 'number' ? val.toFixed(2) : (val ?? "")} Cr`,
                    name === "spentCr" ? "Spent on Players" : "Remaining Purse",
                  ]}
                  contentStyle={{
                    backgroundColor: "#12182a",
                    borderColor: "#ffffff20",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "6px" }} />
                <Bar
                  dataKey="spentCr"
                  name="Spent"
                  stackId="a"
                  fill="#FF6B00"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="remainingCr"
                  name="Remaining Purse"
                  stackId="a"
                  fill="#2A9D8F"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
