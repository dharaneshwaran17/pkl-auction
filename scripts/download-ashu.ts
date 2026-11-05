import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

async function downloadAndProcess() {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Ashu_Malik.png';
  console.log(`Downloading from ${url}...`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
  });
  if (!res.ok) {
    throw new Error(`Failed to download: ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  console.log(`Downloaded ${buffer.length} bytes. Checking image...`);

  const metadata = await sharp(buffer).metadata();
  console.log('Image metadata:', metadata.width, metadata.height, metadata.format);

  const outPath = path.join(process.cwd(), 'public', 'players', 'ashu-malik.webp');
  await sharp(buffer)
    .resize(400, 500, { fit: 'cover', position: 'top' })
    .webp({ quality: 85 })
    .toFile(outPath);

  console.log(`Successfully written WebP to ${outPath}`);
}

downloadAndProcess().catch(console.error);
