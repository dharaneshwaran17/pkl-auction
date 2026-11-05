/**
 * Authoritative Player Photo Registry for Pro Kabaddi League Stars
 * 
 * Rules:
 * 1. Only verified, real, licensed photos are registered here.
 * 2. Never use AI generated faces, stock lookalikes, or unverified images.
 * 3. If a player does not have a verified real photo, returns null, allowing
 *    the UI to render the authentic monogram badge fallback.
 */

export interface PlayerPhotoMeta {
  playerId: string;
  name: string;
  imagePath: string;
  source: string;
  license: string;
}

export const VERIFIED_PLAYER_PHOTOS: Record<string, string> = {
  // Pawan Sehrawat
  "pawan sehrawat": "/players/pawan-sehrawat.webp",
  "pawan sehrawat (hi-flyer)": "/players/pawan-sehrawat.webp",
  "pawan sherawat": "/players/pawan-sehrawat.webp",

  // Pardeep Narwal
  "pardeep narwal": "/players/pardeep-narwal.webp",
  "pardeep narwal (record breaker)": "/players/pardeep-narwal.webp",
  "pradeep narwal": "/players/pardeep-narwal.webp",

  // Mohit Chhillar
  "mohit chhillar": "/players/mohit-chhillar.webp",
  "mohit chillar": "/players/mohit-chhillar.webp",

  // Vishal Mane
  "vishal mane": "/players/vishal-mane.webp",

  // Prashanth Kumar Rai
  "prashanth kumar rai": "/players/prashanth-kumar-rai.webp",
  "prashanth rai": "/players/prashanth-kumar-rai.webp",

  // Jasvir Singh
  "jasvir singh": "/players/jasvir-singh.webp",
  "jasvir": "/players/jasvir-singh.webp",
};

/**
 * Returns the verified real photo URL if available, or null for badge fallback.
 */
export function getPlayerImageUrl(name: string): string | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  if (VERIFIED_PLAYER_PHOTOS[clean]) {
    return VERIFIED_PLAYER_PHOTOS[clean];
  }

  // Also check without parentheses nicknames
  const stripped = clean.replace(/\s*\([^)]*\)/g, "").trim();
  if (VERIFIED_PLAYER_PHOTOS[stripped]) {
    return VERIFIED_PLAYER_PHOTOS[stripped];
  }

  return null;
}
