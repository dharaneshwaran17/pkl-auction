"use client";

import React, { useState, useEffect } from "react";
import { getPlayerImageUrl } from "@/lib/auction/playerImages";

interface PlayerAvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  role?: string;
}

export function PlayerAvatar({
  name,
  size = "md",
  className = "",
  role,
}: PlayerAvatarProps) {
  const photoUrl = getPlayerImageUrl(name);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [name]);

  const cleanName = (name || "").replace(/\s*\([^)]*\)/g, "").trim();
  const parts = cleanName.split(" ").filter(Boolean);
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase() || "PK";

  const sizeClasses = {
    xs: "w-6 h-6 text-[9px]",
    sm: "w-8 h-8 text-[11px]",
    md: "w-11 h-11 text-xs",
    lg: "w-20 h-20 text-base",
  }[size];

  const roleBorder = {
    raider: "border-blue-500/50",
    defender: "border-amber-500/50",
    allRounder: "border-purple-500/50",
  }[role || ""] || "border-amber-500/40";

  if (photoUrl && !imageError) {
    return (
      <div
        className={`relative ${sizeClasses} rounded-full overflow-hidden bg-gradient-to-b from-[#1E293B] to-[#0A0D16] border ${roleBorder} shrink-0 flex items-end justify-center shadow-md ${className}`}
        title={cleanName}
      >
        <img
          src={photoUrl}
          alt={cleanName}
          onError={() => setImageError(true)}
          className="w-full h-full object-contain object-bottom drop-shadow"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClasses} rounded-full border ${roleBorder} bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#050810] shrink-0 flex items-center justify-center font-display font-black text-white tracking-wider shadow-md select-none ${className}`}
      title={cleanName}
    >
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{initials}</span>
    </div>
  );
}
