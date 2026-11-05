import {
  CATEGORY_KEYS,
  ROLE_LABELS,
  SCORING_CONFIG,
  type CategoryKey,
  type PlayerRole,
  type ScoringConfig,
} from "./auctionScoring.config";

export type { PlayerRole, ScoringConfig };

export type ConfirmedPurchase = {
  playerId: string;
  name: string;
  role: PlayerRole | string;
  rating: number;
  basePrice: number;
  soldPrice: number;
};

export type TeamScoreInput = {
  teamId: string;
  teamName?: string;
  logoUrl?: string | null;
  colorPrimary?: string;
  colorSecondary?: string;
  initialPurse: number;
  confirmedPurchases: ConfirmedPurchase[];
};

export type ScoreAuctionInput = {
  teams: TeamScoreInput[];
};

export type CategoryScores = Record<CategoryKey, number>;

export type AwardPlayer = {
  playerId: string;
  name: string;
  role: PlayerRole;
  rating: number;
  basePrice: number;
  soldPrice: number;
  teamId: string;
  teamName: string;
};

export type TeamScoreResult = {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  colorPrimary: string;
  colorSecondary: string;
  eligible: boolean;
  ineligibilityReasons: string[];
  rank: number | null;
  indicative: boolean;
  categoryScores: CategoryScores;
  weightedCategoryPoints: CategoryScores;
  finalScore: number;
  playersBought: number;
  roleCounts: Record<PlayerRole, number>;
  totalSpent: number;
  remainingPurse: number;
  totalRatings: number;
  purchases: Array<
    ConfirmedPurchase & { role: PlayerRole }
  >;
};

export type ResultStatus = "WINNER" | "SHARED_WINNERS" | "NO_ELIGIBLE_WINNER";

export type AuctionScoreResult = {
  status: ResultStatus;
  statusExplanation: string;
  scoringConfigVersion: string;
  teams: TeamScoreResult[];
  eligibleTeamIds: string[];
  winnerTeamIds: string[];
  awards: {
    bestRaider: AwardPlayer | null;
    bestDefender: AwardPlayer | null;
    bestAllRounder: AwardPlayer | null;
    mostExpensive: AwardPlayer | null;
    bestValue: AwardPlayer | null;
  };
  winnerVsRunnerUp: {
    winnerTeamIds: string[];
    runnerUpTeamId: string | null;
    runnerUpTeamName: string | null;
    strengthDifference: number;
    weightedCategoryDiffs: CategoryScores;
    explanation: string;
  } | null;
  whyRankedFirst: string;
};

const ROLES: PlayerRole[] = ["raider", "defender", "allRounder"];

export function validateScoringConfig(config: ScoringConfig): void {
  const sum =
    config.weights.raider +
    config.weights.defender +
    config.weights.allRounder +
    config.weights.balance +
    config.weights.purse;
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`Scoring weights must sum to 1, got ${sum}`);
  }
}

validateScoringConfig(SCORING_CONFIG);

function isRole(value: string): value is PlayerRole {
  return (ROLES as string[]).includes(value);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function clamp100(n: number): number {
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function emptyCategory(): CategoryScores {
  return { raider: 0, defender: 0, allRounder: 0, balance: 0, purse: 0 };
}

function topNSum(values: number[], n: number): number {
  const sorted = [...values].sort((a, b) => b - a);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += sorted[i] ?? 0;
  }
  return sum;
}

function teamNameOf(team: TeamScoreInput): string {
  return team.teamName ?? team.teamId;
}

function ratingOk(rating: number, config: ScoringConfig): boolean {
  return (
    typeof rating === "number" &&
    Number.isFinite(rating) &&
    rating >= config.ratingScale.min &&
    rating <= config.ratingScale.max
  );
}

function roleStrength(
  ratings: number[],
  slots: number,
  maxRating: number,
): number {
  if (slots <= 0 || maxRating <= 0) return 0;
  return clamp100((topNSum(ratings, slots) / (slots * maxRating)) * 100);
}

function balanceScore(
  squadSize: number,
  roleCounts: Record<PlayerRole, number>,
  config: ScoringConfig,
): number {
  const completeness = Math.min(1, squadSize / config.squadRules.idealSize);
  let deviation = 0;
  for (const role of ROLES) {
    const actual = squadSize === 0 ? 0 : roleCounts[role] / squadSize;
    deviation += Math.abs(actual - config.idealRoleShare[role]);
  }
  const roleBalance = 1 - 0.5 * deviation;
  return clamp100(100 * (0.5 * completeness + 0.5 * roleBalance));
}

function purseScore(
  remaining: number,
  initialPurse: number,
  config: ScoringConfig,
): number {
  if (initialPurse <= 0) return 0;
  const remainingRatio = remaining / initialPurse;
  const target = config.purse.targetReserveRatio;
  if (target <= 0) return 0;
  return clamp100(100 * Math.min(1, remainingRatio / target));
}

function categoryScoresForTeam(
  purchases: Array<ConfirmedPurchase & { role: PlayerRole }>,
  initialPurse: number,
  config: ScoringConfig,
): { categoryScores: CategoryScores; roleCounts: Record<PlayerRole, number>; totalSpent: number; remainingPurse: number; totalRatings: number } {
  const roleCounts: Record<PlayerRole, number> = {
    raider: 0,
    defender: 0,
    allRounder: 0,
  };
  const ratingsByRole: Record<PlayerRole, number[]> = {
    raider: [],
    defender: [],
    allRounder: [],
  };
  let totalSpent = 0;
  let totalRatings = 0;
  for (const p of purchases) {
    roleCounts[p.role] += 1;
    ratingsByRole[p.role].push(p.rating);
    totalSpent += p.soldPrice;
    totalRatings += p.rating;
  }
  const remainingPurse = initialPurse - totalSpent;
  const categoryScores: CategoryScores = {
    raider: roleStrength(
      ratingsByRole.raider,
      config.countedSlots.raider,
      config.ratingScale.max,
    ),
    defender: roleStrength(
      ratingsByRole.defender,
      config.countedSlots.defender,
      config.ratingScale.max,
    ),
    allRounder: roleStrength(
      ratingsByRole.allRounder,
      config.countedSlots.allRounder,
      config.ratingScale.max,
    ),
    balance: balanceScore(purchases.length, roleCounts, config),
    purse: purseScore(remainingPurse, initialPurse, config),
  };
  return { categoryScores, roleCounts, totalSpent, remainingPurse, totalRatings };
}

function weightedPoints(scores: CategoryScores, config: ScoringConfig): CategoryScores {
  return {
    raider: config.weights.raider * scores.raider,
    defender: config.weights.defender * scores.defender,
    allRounder: config.weights.allRounder * scores.allRounder,
    balance: config.weights.balance * scores.balance,
    purse: config.weights.purse * scores.purse,
  };
}

function unroundedFinal(weighted: CategoryScores): number {
  return (
    weighted.raider +
    weighted.defender +
    weighted.allRounder +
    weighted.balance +
    weighted.purse
  );
}

function pickAward(
  sold: AwardPlayer[],
  predicate: (p: AwardPlayer) => boolean,
  compare: (a: AwardPlayer, b: AwardPlayer) => number,
): AwardPlayer | null {
  const pool = sold.filter(predicate);
  if (pool.length === 0) return null;
  return [...pool].sort(compare)[0] ?? null;
}

function leadingCategories(
  winner: TeamScoreResult,
  other: TeamScoreResult,
): Array<{ key: CategoryKey; diff: number }> {
  const diffs = CATEGORY_KEYS.map((key) => ({
    key,
    diff: winner.weightedCategoryPoints[key] - other.weightedCategoryPoints[key],
  }))
    .filter((d) => d.diff > 0)
    .sort((a, b) => b.diff - a.diff);
  return diffs.slice(0, 2);
}

function explainLead(winner: TeamScoreResult, runnerUp: TeamScoreResult | null): string {
  if (!runnerUp) {
    return `${winner.teamName} is the only eligible team.`;
  }
  const leads = leadingCategories(winner, runnerUp);
  if (leads.length === 0) {
    return `${winner.teamName} ranked first after tie-breakers against ${runnerUp.teamName}.`;
  }
  const parts = leads.map((lead) => {
    const label =
      lead.key === "allRounder"
        ? "All-rounder strength"
        : lead.key === "raider"
          ? "Raider strength"
          : lead.key === "defender"
            ? "Defender strength"
            : lead.key === "balance"
              ? "Balance & completeness"
              : "Purse efficiency";
    return `${label} (+${round2(lead.diff)} weighted points over ${runnerUp.teamName})`;
  });
  if (parts.length === 1) {
    return `Led mainly through ${parts[0]}.`;
  }
  return `Led mainly through ${parts[0]} and ${parts[1]}.`;
}

export function scoreAuction(
  input: ScoreAuctionInput,
  config: ScoringConfig = SCORING_CONFIG,
): AuctionScoreResult {
  validateScoringConfig(config);

  const playerTeams = new Map<string, Set<string>>();
  for (const team of input.teams) {
    for (const p of team.confirmedPurchases) {
      const set = playerTeams.get(p.playerId) ?? new Set<string>();
      set.add(team.teamId);
      playerTeams.set(p.playerId, set);
    }
  }

  const teamResults: TeamScoreResult[] = input.teams.map((team) => {
    const reasons: string[] = [];
    const seenPlayers = new Set<string>();
    const validPurchases: Array<ConfirmedPurchase & { role: PlayerRole }> = [];

    for (const p of team.confirmedPurchases) {
      if (seenPlayers.has(p.playerId)) {
        reasons.push(`Player ${p.playerId} is listed more than once on this squad`);
      }
      seenPlayers.add(p.playerId);

      const owners = playerTeams.get(p.playerId);
      if (owners && owners.size > 1) {
        reasons.push(
          `Player ${p.name} (${p.playerId}) appears on more than one team`,
        );
      }

      if (!isRole(String(p.role))) {
        reasons.push(`Player ${p.name} has an invalid role`);
        continue;
      }
      if (!ratingOk(p.rating, config)) {
        reasons.push(
          `Player ${p.name} has a missing or out-of-scale rating`,
        );
        continue;
      }
      validPurchases.push({ ...p, role: p.role as PlayerRole });
    }

    const { categoryScores, roleCounts, totalSpent, remainingPurse, totalRatings } =
      categoryScoresForTeam(validPurchases, team.initialPurse, config);

    const squadSize = validPurchases.length;
    if (squadSize < config.squadRules.minSize) {
      reasons.push(
        `Squad size ${squadSize} is below the minimum of ${config.squadRules.minSize}`,
      );
    }
    if (squadSize > config.squadRules.maxSize) {
      reasons.push(
        `Squad size ${squadSize} is above the maximum of ${config.squadRules.maxSize}`,
      );
    }
    for (const role of ROLES) {
      if (roleCounts[role] < config.squadRules.minPerRole[role]) {
        reasons.push(
          `Needs at least ${config.squadRules.minPerRole[role]} ${ROLE_LABELS[role].toLowerCase()}(s); has ${roleCounts[role]}`,
        );
      }
    }
    if (totalSpent > team.initialPurse) {
      reasons.push(
        `Spent ${totalSpent} which exceeds the initial purse of ${team.initialPurse}`,
      );
    }

    const uniqueReasons = [...new Set(reasons)];
    const eligible = uniqueReasons.length === 0;
    const weighted = weightedPoints(categoryScores, config);
    const finalScore = round2(unroundedFinal(weighted));

    return {
      teamId: team.teamId,
      teamName: teamNameOf(team),
      logoUrl: team.logoUrl ?? null,
      colorPrimary: team.colorPrimary ?? "#FF6B00",
      colorSecondary: team.colorSecondary ?? "#FFD400",
      eligible,
      ineligibilityReasons: uniqueReasons,
      rank: null,
      indicative: !eligible,
      categoryScores,
      weightedCategoryPoints: weighted,
      finalScore,
      playersBought: squadSize,
      roleCounts,
      totalSpent,
      remainingPurse,
      totalRatings,
      purchases: validPurchases,
    };
  });

  const eligible = teamResults.filter((t) => t.eligible);
  eligible.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.categoryScores.balance !== a.categoryScores.balance) {
      return b.categoryScores.balance - a.categoryScores.balance;
    }
    if (b.totalRatings !== a.totalRatings) return b.totalRatings - a.totalRatings;
    return 0;
  });

  eligible.forEach((team, index) => {
    const prev = eligible[index - 1];
    if (
      prev &&
      team.finalScore === prev.finalScore &&
      team.categoryScores.balance === prev.categoryScores.balance &&
      team.totalRatings === prev.totalRatings
    ) {
      team.rank = prev.rank;
    } else {
      team.rank = index + 1;
    }
  });

  const winnerTeamIds = eligible.filter((t) => t.rank === 1).map((t) => t.teamId);

  let status: ResultStatus;
  let statusExplanation: string;
  if (eligible.length === 0) {
    status = "NO_ELIGIBLE_WINNER";
    statusExplanation =
      "No team met squad size, role, purse, and uniqueness rules, so no Best Auction Squad winner can be declared.";
  } else if (winnerTeamIds.length > 1) {
    status = "SHARED_WINNERS";
    const names = eligible
      .filter((t) => t.rank === 1)
      .map((t) => t.teamName)
      .join(" and ");
    statusExplanation = `${names} share first place as Best Auction Squad.`;
  } else {
    status = "WINNER";
    const winner = eligible[0];
    statusExplanation = `${winner?.teamName ?? "Winner"} is the Best Auction Squad.`;
  }

  const sold: AwardPlayer[] = [];
  for (const team of teamResults) {
    for (const p of team.purchases) {
      sold.push({
        playerId: p.playerId,
        name: p.name,
        role: p.role,
        rating: p.rating,
        basePrice: p.basePrice,
        soldPrice: p.soldPrice,
        teamId: team.teamId,
        teamName: team.teamName,
      });
    }
  }

  const byRoleThenPrice = (role: PlayerRole) => (a: AwardPlayer, b: AwardPlayer) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (a.soldPrice !== b.soldPrice) return a.soldPrice - b.soldPrice;
    return a.playerId.localeCompare(b.playerId);
  };

  const valueRatio = (p: AwardPlayer) => {
    if (p.soldPrice <= 0) return 0;
    return p.rating / (p.soldPrice / p.basePrice);
  };

  const awards = {
    bestRaider: pickAward(sold, (p) => p.role === "raider", byRoleThenPrice("raider")),
    bestDefender: pickAward(
      sold,
      (p) => p.role === "defender",
      byRoleThenPrice("defender"),
    ),
    bestAllRounder: pickAward(
      sold,
      (p) => p.role === "allRounder",
      byRoleThenPrice("allRounder"),
    ),
    mostExpensive: pickAward(
      sold,
      () => true,
      (a, b) =>
        b.soldPrice - a.soldPrice ||
        b.rating - a.rating ||
        a.playerId.localeCompare(b.playerId),
    ),
    bestValue: pickAward(
      sold,
      (p) => p.rating >= config.bestValue.minRating && p.soldPrice > 0 && p.basePrice > 0,
      (a, b) => {
        const d = valueRatio(b) - valueRatio(a);
        if (d !== 0) return d;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.playerId.localeCompare(b.playerId);
      },
    ),
  };

  const rankedEligible = eligible;
  const winners = rankedEligible.filter((t) => t.rank === 1);
  const runnerUp = rankedEligible.find((t) => t.rank !== 1) ?? null;
  const primaryWinner = winners[0] ?? null;

  let winnerVsRunnerUp: AuctionScoreResult["winnerVsRunnerUp"] = null;
  let whyRankedFirst = statusExplanation;

  if (primaryWinner && status !== "NO_ELIGIBLE_WINNER") {
    const compareTo = runnerUp;
    const diffs = emptyCategory();
    if (compareTo) {
      for (const key of CATEGORY_KEYS) {
        diffs[key] =
          primaryWinner.weightedCategoryPoints[key] -
          compareTo.weightedCategoryPoints[key];
      }
    }
    whyRankedFirst =
      status === "SHARED_WINNERS"
        ? `${winners.map((w) => w.teamName).join(" and ")} share first place after score and tie-breakers.`
        : explainLead(primaryWinner, compareTo);
    winnerVsRunnerUp = {
      winnerTeamIds,
      runnerUpTeamId: compareTo?.teamId ?? null,
      runnerUpTeamName: compareTo?.teamName ?? null,
      strengthDifference: compareTo
        ? round2(primaryWinner.finalScore - compareTo.finalScore)
        : 0,
      weightedCategoryDiffs: diffs,
      explanation: whyRankedFirst,
    };
  }

  const byOriginal = new Map(teamResults.map((t) => [t.teamId, t]));
  const ordered = [
    ...rankedEligible,
    ...teamResults.filter((t) => !t.eligible),
  ].map((t) => byOriginal.get(t.teamId)!);

  return {
    status,
    statusExplanation,
    scoringConfigVersion: config.version,
    teams: ordered,
    eligibleTeamIds: eligible.map((t) => t.teamId),
    winnerTeamIds,
    awards,
    winnerVsRunnerUp,
    whyRankedFirst,
  };
}
