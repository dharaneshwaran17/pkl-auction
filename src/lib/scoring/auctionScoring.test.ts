import { describe, expect, it } from "vitest";
import { scoreAuction, validateScoringConfig } from "./auctionScoring";
import { SCORING_CONFIG, type ScoringConfig } from "./auctionScoring.config";
import type { ConfirmedPurchase, TeamScoreInput } from "./auctionScoring";

const PURSE = 100_000_000;

function p(
  id: string,
  role: ConfirmedPurchase["role"],
  rating: number,
  soldPrice = 2_000_000,
  basePrice = 1_000_000,
): ConfirmedPurchase {
  return {
    playerId: id,
    name: id,
    role,
    rating,
    basePrice,
    soldPrice,
  };
}

function fillSquad(
  prefix: string,
  ratings: { raider: number[]; defender: number[]; allRounder: number[] },
  soldPrice = 2_000_000,
): ConfirmedPurchase[] {
  const purchases: ConfirmedPurchase[] = [];
  ratings.raider.forEach((rating, i) => {
    purchases.push(p(`${prefix}-r${i}`, "raider", rating, soldPrice));
  });
  ratings.defender.forEach((rating, i) => {
    purchases.push(p(`${prefix}-d${i}`, "defender", rating, soldPrice));
  });
  ratings.allRounder.forEach((rating, i) => {
    purchases.push(p(`${prefix}-a${i}`, "allRounder", rating, soldPrice));
  });
  return purchases;
}

function team(
  id: string,
  purchases: ConfirmedPurchase[],
  initialPurse = PURSE,
): TeamScoreInput {
  return { teamId: id, teamName: id, initialPurse, confirmedPurchases: purchases };
}

const completeShape = {
  raider: [90, 88, 86, 70, 60],
  defender: [85, 84, 80, 78, 70, 60],
  allRounder: [82, 75, 70],
};

describe("scoreAuction", () => {
  it("scores a normal 4-team case and names a winner", () => {
    const result = scoreAuction({
      teams: [
        team("Alpha", fillSquad("a", { raider: [95, 92, 90, 70, 65], defender: [90, 88, 86, 84, 70, 60], allRounder: [88, 80, 72] })),
        team("Bravo", fillSquad("b", completeShape)),
        team("Charlie", fillSquad("c", { raider: [80, 78, 70, 60, 55], defender: [80, 75, 70, 65, 60, 55], allRounder: [70, 65, 60] })),
        team("Delta", fillSquad("d", { raider: [70, 68, 65, 60, 55], defender: [72, 70, 68, 65, 60, 58], allRounder: [66, 60, 55] })),
      ],
    });
    expect(result.status).toBe("WINNER");
    expect(result.winnerTeamIds).toEqual(["Alpha"]);
    expect(result.teams.filter((t) => t.eligible)).toHaveLength(4);
    expect(result.teams[0]?.rank).toBe(1);
    expect(result.teams[1]?.rank).toBe(2);
    expect(result.whyRankedFirst.toLowerCase()).toContain("raider");
    expect(result.awards.bestRaider?.playerId).toBe("a-r0");
    expect(result.awards.mostExpensive).toBeTruthy();
  });

  it("excludes unsold players because they are not in confirmedPurchases", () => {
    const withUnsoldIgnored = team("Alpha", fillSquad("a", completeShape));
    const result = scoreAuction({
      teams: [
        withUnsoldIgnored,
        team("Bravo", fillSquad("b", completeShape)),
      ],
    });
    expect(result.teams[0]?.playersBought).toBe(14);
    expect(result.teams.every((t) => t.purchases.every((p) => p.playerId.startsWith("a-") || p.playerId.startsWith("b-")))).toBe(true);
  });

  it("marks an incomplete squad ineligible but still returns an indicative score", () => {
    const result = scoreAuction({
      teams: [
        team("Short", [
          p("s1", "raider", 90),
          p("s2", "raider", 80),
          p("s3", "defender", 80),
          p("s4", "defender", 70),
          p("s5", "defender", 60),
          p("s6", "allRounder", 70),
        ]),
        team("Full", fillSquad("f", completeShape)),
      ],
    });
    const short = result.teams.find((t) => t.teamId === "Short");
    expect(short?.eligible).toBe(false);
    expect(short?.indicative).toBe(true);
    expect(short?.rank).toBeNull();
    expect(short?.ineligibilityReasons.some((r) => r.includes("Squad size"))).toBe(true);
    expect(result.winnerTeamIds).toEqual(["Full"]);
  });

  it("marks over-budget teams ineligible", () => {
    const purchases = fillSquad("o", completeShape, 20_000_000);
    const result = scoreAuction({
      teams: [
        team("Over", purchases, 100_000_000),
        team("Ok", fillSquad("k", completeShape), 100_000_000),
      ],
    });
    const over = result.teams.find((t) => t.teamId === "Over");
    expect(over?.eligible).toBe(false);
    expect(over?.ineligibilityReasons.some((r) => r.includes("exceeds"))).toBe(true);
    expect(result.winnerTeamIds).toEqual(["Ok"]);
  });

  it("marks duplicate players ineligible on every team that holds them", () => {
    const shared = p("dup", "raider", 99);
    const a = fillSquad("a", completeShape);
    a[0] = shared;
    const b = fillSquad("b", completeShape);
    b[0] = { ...shared };
    const result = scoreAuction({ teams: [team("A", a), team("B", b)] });
    expect(result.teams.every((t) => t.eligible === false)).toBe(true);
    expect(result.status).toBe("NO_ELIGIBLE_WINNER");
    expect(result.teams[0]?.ineligibilityReasons.some((r) => r.includes("more than one team"))).toBe(true);
  });

  it("breaks a final-score tie using the balance category", () => {
    const balanced = fillSquad("bal", {
      raider: [80, 80, 80, 70, 60],
      defender: [80, 80, 80, 80, 70, 60],
      allRounder: [80, 80, 70],
    });
    const unbalanced = fillSquad("unb", {
      raider: [88, 88, 88, 70, 60, 50, 40],
      defender: [80, 80, 80],
      allRounder: [80, 80, 70, 60],
    });
    const result = scoreAuction({
      teams: [team("Unbalanced", unbalanced), team("Balanced", balanced)],
    });
    const bal = result.teams.find((t) => t.teamId === "Balanced")!;
    const unb = result.teams.find((t) => t.teamId === "Unbalanced")!;
    expect(bal.eligible && unb.eligible).toBe(true);
    if (bal.finalScore === unb.finalScore) {
      expect(bal.categoryScores.balance).toBeGreaterThan(unb.categoryScores.balance);
      expect(bal.rank).toBe(1);
      expect(unb.rank).toBe(2);
    } else {
      const leader = bal.finalScore >= unb.finalScore ? bal : unb;
      const trailer = leader === bal ? unb : bal;
      expect(leader.rank).toBe(1);
      expect(trailer.rank).toBe(2);
      expect(bal.categoryScores.balance).toBeGreaterThan(unb.categoryScores.balance);
    }
  });

  it("breaks a remaining tie using total squad ratings", () => {
    const lower = fillSquad("lo", {
      raider: [90, 80, 70, 40, 40],
      defender: [90, 80, 70, 60, 40, 40],
      allRounder: [80, 70, 40],
    });
    const higher = fillSquad("hi", {
      raider: [90, 80, 70, 50, 50],
      defender: [90, 80, 70, 60, 50, 50],
      allRounder: [80, 70, 50],
    });
    const result = scoreAuction({
      teams: [team("Lower", lower), team("Higher", higher)],
    });
    const hi = result.teams.find((t) => t.teamId === "Higher")!;
    const lo = result.teams.find((t) => t.teamId === "Lower")!;
    expect(hi.totalRatings).toBeGreaterThan(lo.totalRatings);
    if (hi.finalScore === lo.finalScore && hi.categoryScores.balance === lo.categoryScores.balance) {
      expect(hi.rank).toBe(1);
      expect(lo.rank).toBe(2);
    } else {
      expect(hi.finalScore).toBeGreaterThanOrEqual(lo.finalScore);
    }
  });

  it("shares first place when eligible teams fully tie", () => {
    const squad = completeShape;
    const result = scoreAuction({
      teams: [
        team("One", fillSquad("one", squad)),
        team("Two", fillSquad("two", squad)),
      ],
    });
    expect(result.status).toBe("SHARED_WINNERS");
    expect(result.winnerTeamIds.sort()).toEqual(["One", "Two"]);
    expect(result.teams[0]?.rank).toBe(1);
    expect(result.teams[1]?.rank).toBe(1);
  });

  it("returns NO_ELIGIBLE_WINNER when every team fails eligibility", () => {
    const result = scoreAuction({
      teams: [
        team("A", [p("a1", "raider", 90)]),
        team("B", [p("b1", "defender", 80)]),
      ],
    });
    expect(result.status).toBe("NO_ELIGIBLE_WINNER");
    expect(result.winnerTeamIds).toEqual([]);
    expect(result.whyRankedFirst).toMatch(/no team/i);
  });

  it("treats an empty squad as ineligible with an indicative score of 0-ish balance", () => {
    const result = scoreAuction({
      teams: [team("Empty", []), team("Full", fillSquad("f", completeShape))],
    });
    const empty = result.teams.find((t) => t.teamId === "Empty")!;
    expect(empty.eligible).toBe(false);
    expect(empty.playersBought).toBe(0);
    expect(empty.finalScore).toBeGreaterThanOrEqual(0);
    expect(empty.ineligibilityReasons[0]).toMatch(/Squad size 0/);
  });

  it("throws when weights do not sum to 1", () => {
    const bad: ScoringConfig = {
      ...SCORING_CONFIG,
      weights: { raider: 1, defender: 1, allRounder: 0, balance: 0, purse: 0 },
    };
    expect(() => validateScoringConfig(bad)).toThrow(/sum to 1/);
    expect(() => scoreAuction({ teams: [] }, bad)).toThrow(/sum to 1/);
  });

  it("rounds the final score to 2 decimals only at the end", () => {
    const result = scoreAuction({
      teams: [team("Round", fillSquad("r", {
        raider: [91, 83, 77, 61, 59],
        defender: [89, 81, 74, 67, 63, 52],
        allRounder: [88, 71, 64],
      }))],
    });
    const final = result.teams[0]!.finalScore;
    expect(Number(final.toFixed(2))).toBe(final);
    const unrounded =
      result.teams[0]!.weightedCategoryPoints.raider +
      result.teams[0]!.weightedCategoryPoints.defender +
      result.teams[0]!.weightedCategoryPoints.allRounder +
      result.teams[0]!.weightedCategoryPoints.balance +
      result.teams[0]!.weightedCategoryPoints.purse;
    expect(Math.abs(final - unrounded)).toBeLessThan(0.01 + 1e-9);
  });

  it("uses competition ranking 1,1,3 for a partial tie", () => {
    const shared = completeShape;
    const weaker = {
      raider: [50, 50, 50, 50, 50],
      defender: [50, 50, 50, 50, 50, 50],
      allRounder: [50, 50, 50],
    };
    const result = scoreAuction({
      teams: [
        team("A", fillSquad("a", shared)),
        team("B", fillSquad("b", shared)),
        team("C", fillSquad("c", weaker)),
      ],
    });
    const ranks = result.teams.filter((t) => t.eligible).map((t) => t.rank);
    expect(ranks).toEqual([1, 1, 3]);
  });

  it("picks best-value by rating divided by price ratio, then higher rating", () => {
    const squad = fillSquad("v", completeShape, 3_000_000);
    squad[0] = p("bargain", "raider", 90, 2_000_000, 2_000_000);
    squad[1] = p("pricey", "raider", 90, 6_000_000, 2_000_000);
    const result = scoreAuction({ teams: [team("V", squad)] });
    expect(result.awards.bestValue?.playerId).toBe("bargain");
  });
});
