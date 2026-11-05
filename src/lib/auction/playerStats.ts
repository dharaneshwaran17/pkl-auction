import { findPKLPlayer } from "./pkl250Players";

export type PlayerDetails = {
  badgeNo?: string;
  initials?: string;
  category: string;
  categoryLabel: string;
  nationality: string;
  isOverseas: boolean;
  matches: number;
  stat1Label: string;
  stat1Value: string | number;
  stat1Color: string;
  stat2Label: string;
  stat2Value: string | number;
  stat2Color: string;
  stat3Label: string;
  stat3Value: string | number;
  stat3Color: string;
  stat4Label: string;
  stat4Value: string | number;
  stat4Color: string;
  accentGradient: string;
  jerseyNumber: number;
};

const OVERSEAS_PLAYERS = new Set([
  "Mohammadreza Shadloui (Left Corner)",
  "Fazel Atrachali (Sultan - Left Corner)",
  "Amirmohammad Zafardanesh",
  "Mohammad Nabibakhsh",
  "Reza Mirbagheri",
  "Milad Jabbari (Right Cover)",
]);

// Known landmark PKL stats for top stars
const SPECIAL_STATS: Record<string, Partial<PlayerDetails>> = {
  "Pawan Sehrawat (Hi-Flyer)": {
    matches: 126,
    stat1Label: "MATCHES",
    stat1Value: 126,
    stat2Label: "RAID PTS",
    stat2Value: 1189,
    stat3Label: "STRIKE RATE",
    stat3Value: "64.2%",
    stat4Label: "SUPER 10s",
    stat4Value: 63,
    jerseyNumber: 17,
  },
  "Pardeep Narwal (Record Breaker)": {
    matches: 170,
    stat1Label: "MATCHES",
    stat1Value: 170,
    stat2Label: "RAID PTS",
    stat2Value: 1690,
    stat3Label: "STRIKE RATE",
    stat3Value: "59.8%",
    stat4Label: "SUPER 10s",
    stat4Value: 85,
    jerseyNumber: 9,
  },
  "Naveen Kumar (Naveen Express)": {
    matches: 91,
    stat1Label: "MATCHES",
    stat1Value: 91,
    stat2Label: "RAID PTS",
    stat2Value: 1005,
    stat3Label: "STRIKE RATE",
    stat3Value: "68.5%",
    stat4Label: "SUPER 10s",
    stat4Value: 64,
    jerseyNumber: 10,
  },
  "Arjun Deshwal (Raid Machine)": {
    matches: 91,
    stat1Label: "MATCHES",
    stat1Value: 91,
    stat2Label: "RAID PTS",
    stat2Value: 948,
    stat3Label: "STRIKE RATE",
    stat3Value: "65.1%",
    stat4Label: "SUPER 10s",
    stat4Value: 53,
    jerseyNumber: 12,
  },
  "Maninder Singh (Mighty Mani)": {
    matches: 143,
    stat1Label: "MATCHES",
    stat1Value: 143,
    stat2Label: "RAID PTS",
    stat2Value: 1428,
    stat3Label: "STRIKE RATE",
    stat3Value: "63.7%",
    stat4Label: "SUPER 10s",
    stat4Value: 72,
    jerseyNumber: 13,
  },
  "Mohammadreza Shadloui (Left Corner)": {
    matches: 68,
    stat1Label: "MATCHES",
    stat1Value: 68,
    stat2Label: "TACKLE PTS",
    stat2Value: 312,
    stat3Label: "STRIKE RATE",
    stat3Value: "61.4%",
    stat4Label: "HIGH 5s",
    stat4Value: 27,
    jerseyNumber: 5,
  },
  "Fazel Atrachali (Sultan - Left Corner)": {
    matches: 169,
    stat1Label: "MATCHES",
    stat1Value: 169,
    stat2Label: "TACKLE PTS",
    stat2Value: 486,
    stat3Label: "STRIKE RATE",
    stat3Value: "55.2%",
    stat4Label: "HIGH 5s",
    stat4Value: 30,
    jerseyNumber: 1,
  },
  "Sunil Kumar (Right Cover)": {
    matches: 137,
    stat1Label: "MATCHES",
    stat1Value: 137,
    stat2Label: "TACKLE PTS",
    stat2Value: 336,
    stat3Label: "STRIKE RATE",
    stat3Value: "51.8%",
    stat4Label: "HIGH 5s",
    stat4Value: 20,
    jerseyNumber: 7,
  },
  "Sagar Rathee (Right Corner)": {
    matches: 72,
    stat1Label: "MATCHES",
    stat1Value: 72,
    stat2Label: "TACKLE PTS",
    stat2Value: 236,
    stat3Label: "STRIKE RATE",
    stat3Value: "54.6%",
    stat4Label: "HIGH 5s",
    stat4Value: 21,
    jerseyNumber: 4,
  },
};

export function getPlayerDetails(name: string, role: string = "raider", ratingInput: number = 85): PlayerDetails {
  const rating = ratingInput && ratingInput > 50 ? ratingInput : 87;
  const pklMatch = findPKLPlayer(name);
  if (pklMatch) {
    const isOverseas =
      pklMatch.name.includes("Atrachali") ||
      pklMatch.name.includes("Shadloui") ||
      pklMatch.name.includes("Zafardanesh") ||
      pklMatch.name.includes("Nabibakhsh") ||
      pklMatch.name.includes("Ghorbani") ||
      pklMatch.name.includes("Khojasteh") ||
      pklMatch.name.includes("Lee") ||
      pklMatch.name.includes("Karim") ||
      pklMatch.name.includes("Obiero") ||
      pklMatch.name.includes("Safaghi") ||
      pklMatch.name.includes("Ejlali") ||
      pklMatch.name.includes("Mirzaian") ||
      pklMatch.name.includes("Mighani") ||
      pklMatch.name.includes("Oshtorak");

    const catBadge =
      pklMatch.category === "A"
        ? "CAT A • ₹30L"
        : pklMatch.category === "B"
        ? "CAT B • ₹20L"
        : pklMatch.category === "C"
        ? "CAT C • ₹13L"
        : "CAT D • ₹9L";

    return {
      badgeNo: pklMatch.badgeNo,
      initials: pklMatch.initials,
      category: `CATEGORY ${pklMatch.category}`,
      categoryLabel: catBadge,
      nationality: isOverseas ? "OVERSEAS" : "INDIAN",
      isOverseas,
      matches: pklMatch.matches,
      stat1Label: pklMatch.stat1Label,
      stat1Value: pklMatch.stat1Value,
      stat1Color: "text-white",
      stat2Label: pklMatch.stat2Label,
      stat2Value: pklMatch.stat2Value,
      stat2Color: "text-emerald-400",
      stat3Label: pklMatch.stat3Label,
      stat3Value: pklMatch.stat3Value,
      stat3Color: "text-cyan-400",
      stat4Label: pklMatch.stat4Label,
      stat4Value: pklMatch.stat4Value,
      stat4Color: "text-amber-400",
      accentGradient: isOverseas ? "from-purple-600 to-indigo-900" : "from-orange-500 to-amber-700",
      jerseyNumber: (rating % 23) + 1,
    };
  }

  const isOverseas = OVERSEAS_PLAYERS.has(name) || name.includes("Atrachali") || name.includes("Shadloui") || name.includes("Zafardanesh") || name.includes("Nabibakhsh");
  const nationality = isOverseas ? "OVERSEAS (IRAN)" : "INDIAN";

  let category = "CATEGORY B";
  if (rating >= 94) category = "MARQUEE SET 1";
  else if (rating >= 91) category = "MARQUEE SET 2";
  else if (rating >= 88) category = "CATEGORY A";
  else if (rating < 84) category = "CATEGORY C";

  // Derive pseudo-realistic stats based on role and rating if not explicitly specified
  const clean = name.replace(/\s*\([^)]*\)/g, "").trim();
  const special = SPECIAL_STATS[name] || SPECIAL_STATS[clean] || Object.entries(SPECIAL_STATS).find(([k]) => k.includes(clean) || clean.includes(k.replace(/\s*\([^)]*\)/g, "").trim()))?.[1];
  if (special) {
    return {
      category,
      categoryLabel: category,
      nationality,
      isOverseas,
      matches: special.matches ?? 85,
      stat1Label: special.stat1Label ?? "MATCHES",
      stat1Value: special.stat1Value ?? (special.matches ?? 85),
      stat1Color: "text-white",
      stat2Label: special.stat2Label ?? "POINTS",
      stat2Value: special.stat2Value ?? 650,
      stat2Color: "text-emerald-400",
      stat3Label: special.stat3Label ?? "STRIKE RATE",
      stat3Value: special.stat3Value ?? "58.0%",
      stat3Color: "text-cyan-400",
      stat4Label: special.stat4Label ?? "SUPER 10s",
      stat4Value: special.stat4Value ?? 25,
      stat4Color: "text-amber-400",
      accentGradient: isOverseas ? "from-purple-600 to-indigo-900" : "from-orange-500 to-amber-700",
      jerseyNumber: special.jerseyNumber ?? (rating % 23) + 1,
    };
  }

  // Fallback programmatic generation based on rating & role
  const matches = Math.round(50 + (rating - 75) * 3.5);
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const jerseyNumber = (hash % 25) + 1;

  if (role === "raider") {
    const raidPts = Math.round((rating - 70) * 28 + (hash % 120));
    const strikeRate = (50 + (rating - 75) * 0.8 + (hash % 5) * 0.5).toFixed(1) + "%";
    const super10s = Math.max(3, Math.round((rating - 78) * 2.2 + (hash % 6)));
    return {
      category,
      categoryLabel: category,
      nationality,
      isOverseas,
      matches,
      stat1Label: "MATCHES",
      stat1Value: matches,
      stat1Color: "text-white",
      stat2Label: "RAID PTS",
      stat2Value: raidPts,
      stat2Color: "text-emerald-400",
      stat3Label: "STRIKE RATE",
      stat3Value: strikeRate,
      stat3Color: "text-cyan-400",
      stat4Label: "SUPER 10s",
      stat4Value: super10s,
      stat4Color: "text-amber-400",
      accentGradient: "from-blue-600 to-indigo-950",
      jerseyNumber,
    };
  }

  if (role === "defender") {
    const tacklePts = Math.round((rating - 72) * 11 + (hash % 40));
    const strikeRate = (45 + (rating - 75) * 0.6 + (hash % 4) * 0.4).toFixed(1) + "%";
    const high5s = Math.max(2, Math.round((rating - 80) * 1.3 + (hash % 4)));
    return {
      category,
      categoryLabel: category,
      nationality,
      isOverseas,
      matches,
      stat1Label: "MATCHES",
      stat1Value: matches,
      stat1Color: "text-white",
      stat2Label: "TACKLE PTS",
      stat2Value: tacklePts,
      stat2Color: "text-emerald-400",
      stat3Label: "STRIKE RATE",
      stat3Value: strikeRate,
      stat3Color: "text-cyan-400",
      stat4Label: "HIGH 5s",
      stat4Value: high5s,
      stat4Color: "text-amber-400",
      accentGradient: "from-amber-600 to-orange-950",
      jerseyNumber,
    };
  }

  // All-Rounder
  const totalPts = Math.round((rating - 70) * 18 + (hash % 70));
  const raidPortion = Math.round(totalPts * 0.55);
  const tacklePortion = totalPts - raidPortion;
  return {
    category,
    categoryLabel: category,
    nationality,
    isOverseas,
    matches,
    stat1Label: "MATCHES",
    stat1Value: matches,
    stat1Color: "text-white",
    stat2Label: "TOTAL PTS",
    stat2Value: totalPts,
    stat2Color: "text-emerald-400",
    stat3Label: "RAID PTS",
    stat3Value: raidPortion,
    stat3Color: "text-cyan-400",
    stat4Label: "TACKLE PTS",
    stat4Value: tacklePortion,
    stat4Color: "text-amber-400",
    accentGradient: "from-purple-600 to-fuchsia-950",
    jerseyNumber,
  };
}
