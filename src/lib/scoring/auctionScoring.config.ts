export type PlayerRole = "raider" | "defender" | "allRounder";

export type ScoringConfig = {
  version: string;
  weights: {
    raider: number;
    defender: number;
    allRounder: number;
    balance: number;
    purse: number;
  };
  ratingScale: { min: number; max: number };
  countedSlots: { raider: number; defender: number; allRounder: number };
  squadRules: {
    minSize: number;
    maxSize: number;
    idealSize: number;
    minPerRole: { raider: number; defender: number; allRounder: number };
  };
  idealRoleShare: { raider: number; defender: number; allRounder: number };
  purse: { targetReserveRatio: number };
  bestValue: { minRating: number };
};

export const SCORING_CONFIG: ScoringConfig = {
  version: "1.0.0",
  weights: {
    raider: 0.3,
    defender: 0.3,
    allRounder: 0.2,
    balance: 0.15,
    purse: 0.05,
  },
  ratingScale: { min: 0, max: 100 },
  countedSlots: { raider: 3, defender: 4, allRounder: 2 },
  squadRules: {
    minSize: 10,
    maxSize: 18,
    idealSize: 14,
    minPerRole: { raider: 2, defender: 3, allRounder: 1 },
  },
  idealRoleShare: { raider: 0.35, defender: 0.4, allRounder: 0.25 },
  purse: { targetReserveRatio: 0.1 },
  bestValue: { minRating: 70 },
};

export const ROLE_LABELS: Record<PlayerRole, string> = {
  raider: "Raider",
  defender: "Defender",
  allRounder: "All-rounder",
};

export const CATEGORY_KEYS = [
  "raider",
  "defender",
  "allRounder",
  "balance",
  "purse",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];
