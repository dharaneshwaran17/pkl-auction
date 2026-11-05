import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import manifest from '../public/players/manifest.json';
import { VERIFIED_PLAYER_PHOTOS, getPlayerImageUrl } from '../src/lib/auction/playerImages';

async function main() {
  console.log('--- Verifying Manifest and Photos ---');
  let manifestErrors = 0;
  for (const item of manifest) {
    const fullPath = path.join(process.cwd(), 'public', item.imagePath);
    if (!fs.existsSync(fullPath)) {
      console.error(`ERROR: File missing for ${item.name}: ${fullPath}`);
      manifestErrors++;
      continue;
    }
    try {
      const meta = await sharp(fullPath).metadata();
      console.log(`✓ [${item.playerId}] ${item.name}: ${meta.width}x${meta.height} (${meta.format}) - License: ${item.license}`);
    } catch (err: any) {
      console.error(`ERROR decoding ${fullPath}:`, err.message);
      manifestErrors++;
    }
  }

  console.log('\n--- Verifying VERIFIED_PLAYER_PHOTOS mappings ---');
  let mapErrors = 0;
  for (const [key, relPath] of Object.entries(VERIFIED_PLAYER_PHOTOS)) {
    const fullPath = path.join(process.cwd(), 'public', relPath);
    if (!fs.existsSync(fullPath)) {
      console.error(`ERROR: Mapped file missing for key "${key}": ${fullPath}`);
      mapErrors++;
    }
  }

  console.log('\n--- Test getPlayerImageUrl lookups ---');
  const testNames = [
    'Pawan Sehrawat',
    'Pawan Sehrawat (Hi-Flyer)',
    'Pardeep Narwal',
    'Pardeep Narwal (Record Breaker)',
    'Ashu Malik',
    'Jasvir Singh',
    'Mohit Chhillar',
    'Vishal Mane',
    'Prashanth Kumar Rai',
    'Ajay Thakur', // Should return null (badge fallback)
    'Naveen Kumar', // Should return null (badge fallback)
  ];

  for (const name of testNames) {
    const url = getPlayerImageUrl(name);
    console.log(`Lookup "${name}" => ${url || 'NULL (Monogram Badge Fallback)'}`);
  }

  if (manifestErrors === 0 && mapErrors === 0) {
    console.log('\n✅ ALL VERIFIED IMAGES EXIST AND DECODE CLEANLY!');
  } else {
    console.error(`\n❌ VERIFICATION FAILED: ${manifestErrors} manifest errors, ${mapErrors} map errors`);
    process.exit(1);
  }
}

main().catch(console.error);
