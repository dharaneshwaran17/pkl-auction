"use client";

import React, { useState, useEffect } from "react";
import type { PlayerRole } from "@prisma/client";
import { findPKLPlayer } from "@/lib/auction/pkl250Players";
import { getPlayerImageUrl } from "@/lib/auction/playerImages";

interface PlayerCardPhotoProps {
  name: string;
  role: PlayerRole;
  rating: number;
  jerseyNumber: number;
  isOverseas?: boolean;
  badgeNo?: string;
  categoryLabel?: string;
  isSold?: boolean;
}

export function PlayerCardPhoto({
  name,
  role,
  rating,
  jerseyNumber,
  isOverseas,
  badgeNo,
  categoryLabel,
  isSold = false,
}: PlayerCardPhotoProps) {
  // Find matching PKL player data if available
  const pklMatch = findPKLPlayer(name);

  // Clean name without nicknames for initials and display
  const cleanName = (pklMatch?.name ?? name).replace(/\s*\([^)]*\)/g, "").trim();
  const parts = cleanName.split(" ");
  const initials =
    pklMatch?.initials ??
    (parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase());

  const displayBadgeNo = pklMatch?.badgeNo ?? badgeNo ?? "#001";
  const displayCategory =
    categoryLabel ??
    (pklMatch
      ? `CAT ${pklMatch.category} • ₹${(pklMatch.basePrice / 100_000).toFixed(0)}L`
      : "CAT A • ₹30L");

  // Real player photo resolution with automatic fallback tracking
  const photoUrl = getPlayerImageUrl(name);
  const [imageError, setImageError] = useState(false);

  // Reset image error state whenever name changes
  useEffect(() => {
    setImageError(false);
  }, [name]);

  const hasRealPhoto = Boolean(photoUrl && !imageError);

  const roleColors = {
    raider: {
      primary: "#2563EB",
      glow: "rgba(37, 99, 235, 0.45)",
      border: "border-blue-500/40",
      text: "text-blue-400",
      badgeBg: "bg-blue-600/20 text-blue-300 border-blue-500/40",
      ringColor: "#3B82F6",
      label: "RAIDER",
    },
    defender: {
      primary: "#D97706",
      glow: "rgba(217, 119, 6, 0.45)",
      border: "border-amber-500/40",
      text: "text-amber-400",
      badgeBg: "bg-amber-600/20 text-amber-300 border-amber-500/40",
      ringColor: "#F59E0B",
      label: "DEFENDER",
    },
    allRounder: {
      primary: "#7C3AED",
      glow: "rgba(124, 58, 237, 0.45)",
      border: "border-purple-500/40",
      text: "text-purple-400",
      badgeBg: "bg-purple-600/20 text-purple-300 border-purple-500/40",
      ringColor: "#8B5CF6",
      label: "ALL-RND",
    },
  }[role];

  return (
    <div className="relative w-full aspect-[3/4] max-h-[250px] sm:max-h-[270px] rounded-2xl overflow-hidden bg-gradient-to-b from-[#182030] via-[#0E1322] to-[#070A10] border-2 border-white/15 shadow-2xl flex flex-col justify-between p-3 group select-none transition-all duration-300 hover:border-white/30">
      {/* Studio Spotlight Glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full blur-3xl pointer-events-none"
        style={{ background: roleColors.glow }}
      />

      {/* Top Header: Badge Number & Role Pill */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="font-mono text-xs font-black tracking-wider text-white/80 bg-black/60 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">
          {displayBadgeNo}
        </span>

        <span
          className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wider uppercase backdrop-blur-sm ${roleColors.badgeBg}`}
        >
          {roleColors.label}
        </span>
      </div>

      {/* Center Stage: Real Player Photo OR Authentic Monogram Badge */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-0.5">
        {hasRealPhoto && photoUrl ? (
          /* Real Verified Player Photo Display */
          <div className="relative w-full h-28 sm:h-32 flex items-center justify-center overflow-hidden my-0.5">
            {/* Ambient Back Glow */}
            <div
              className="absolute inset-0 rounded-full blur-xl opacity-35"
              style={{ backgroundColor: roleColors.ringColor }}
            />
            {/* Real Player Photo with object-contain and object-bottom */}
            <img
              src={photoUrl}
              alt={cleanName}
              onError={() => setImageError(true)}
              className="relative z-10 h-full max-w-full object-contain object-bottom drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-105"
            />
            {/* Subtle Jersey Number Badge */}
            <div className="absolute bottom-0 right-2 px-1.5 py-0.5 rounded-full bg-black/85 border border-white/20 text-[9px] font-mono font-bold text-white shadow-md z-20">
              #{jerseyNumber || 10}
            </div>
          </div>
        ) : (
          /* Monogram Badge Fallback */
          <div className="relative flex items-center justify-center my-1">
            {/* Animated Glow Halo */}
            <div
              className="absolute inset-0 rounded-full blur-md opacity-75 animate-pulse"
              style={{ backgroundColor: roleColors.ringColor }}
            />

            {/* Double Ring Emblem Disc */}
            <div
              className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center shadow-[inset_0_2px_8px_rgba(255,255,255,0.2),0_8px_20px_rgba(0,0,0,0.8)] border-4 transition-transform duration-300 group-hover:scale-105"
              style={{
                borderColor: roleColors.ringColor,
                background: `radial-gradient(circle at 35% 35%, #1F293D 0%, #0A0F1A 100%)`,
              }}
            >
              {/* Monogram Initials */}
              <span className="font-display text-2xl sm:text-3xl font-black text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {initials}
              </span>

              {/* Micro Badge Star */}
              <div className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-black/80 border border-white/20 text-[8px] font-mono font-bold text-white/80">
                #{jerseyNumber || 10}
              </div>
            </div>
          </div>
        )}

        {/* Player Name */}
        <h3 className="font-display text-sm sm:text-base font-black text-white tracking-wide text-center mt-1.5 line-clamp-1 leading-tight">
          {cleanName}
        </h3>

        {/* Category & Base Price Badge */}
        <span className="text-[10px] font-mono font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 mt-1">
          {displayCategory}
        </span>
      </div>

      {/* Bottom Rating Status (Confidential during live bidding) */}
      <div className="relative z-10 flex items-center justify-center pt-1 border-t border-white/10">
        <div
          className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/5 border border-white/15 text-muted text-[10px] font-bold tracking-wider"
          title="Rating is hidden during auction"
        >
          <span>🔒</span>
          <span className="text-white/70">RATING:</span>
          <span className="text-amber-400 font-mono font-black">???</span>
        </div>
      </div>
    </div>
  );
}
