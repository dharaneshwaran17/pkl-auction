import { describe, expect, it } from "vitest";
import { getPlayerImageUrl, VERIFIED_PLAYER_PHOTOS } from "./playerImages";
import fs from "node:fs";
import path from "node:path";

describe("Player Photo Registry & Fallback", () => {
  it("resolves verified real WebP photos for known stars", () => {
    expect(getPlayerImageUrl("Pawan Sehrawat")).toBe("/players/pawan-sehrawat.webp");
    expect(getPlayerImageUrl("Pawan Sehrawat (Hi-Flyer)")).toBe("/players/pawan-sehrawat.webp");
    expect(getPlayerImageUrl("Pardeep Narwal")).toBe("/players/pardeep-narwal.webp");
    expect(getPlayerImageUrl("Pardeep Narwal (Record Breaker)")).toBe("/players/pardeep-narwal.webp");
    expect(getPlayerImageUrl("Mohit Chhillar")).toBe("/players/mohit-chhillar.webp");
    expect(getPlayerImageUrl("Vishal Mane")).toBe("/players/vishal-mane.webp");
    expect(getPlayerImageUrl("Prashanth Kumar Rai")).toBe("/players/prashanth-kumar-rai.webp");
  });

  it("returns null for players without verified real photos to trigger monogram badge fallback", () => {
    expect(getPlayerImageUrl("Unknown Player")).toBeNull();
    expect(getPlayerImageUrl("Naveen Kumar (Naveen Express)")).toBeNull();
    expect(getPlayerImageUrl("")).toBeNull();
  });

  it("ensures all mapped photos actually exist on disk in public/players/ as WebP", () => {
    const publicDir = path.resolve(process.cwd(), "public");
    for (const imagePath of Object.values(VERIFIED_PLAYER_PHOTOS)) {
      const fullPath = path.join(publicDir, imagePath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(imagePath.endsWith(".webp")).toBe(true);
    }
  });

  it("ensures manifest.json exists and contains complete attribution metadata", () => {
    const manifestPath = path.resolve(process.cwd(), "public/players/manifest.json");
    expect(fs.existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(Array.isArray(manifest)).toBe(true);
    expect(manifest.length).toBeGreaterThanOrEqual(5);

    for (const entry of manifest) {
      expect(entry.name).toBeTruthy();
      expect(entry.imagePath).toBeTruthy();
      expect(entry.source).toBeTruthy();
      expect(entry.license).toBeTruthy();
      expect(entry.author).toBeTruthy();
    }
  });
});
