import sharp from 'sharp';
import path from 'node:path';

async function processJasvir() {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/8/89/The_President%2C_Shri_Ram_Nath_Kovind_presenting_the_Arjuna_Award%2C_2017_to_Shri_Jasvir_Singh_for_Kabaddi%2C_in_a_glittering_ceremony%2C_at_Rashtrapati_Bhavan%2C_in_New_Delhi_on_August_29%2C_2017.jpg';
  console.log('Downloading Jasvir Singh image...');
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
  });
  if (!res.ok) throw new Error(res.statusText);
  const buffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  console.log('Original dimensions:', meta.width, meta.height);

  // In the photo (2200x1467), Jasvir Singh is on the left standing profile/facing the President.
  // Let's crop his upper torso/head:
  // left: 2200 * 0.15 = 330, width: 2200 * 0.35 = 770
  // top: 1467 * 0.05 = 73, height: 1467 * 0.70 = 1026
  const cropLeft = Math.round(meta.width! * 0.15);
  const cropTop = Math.round(meta.height! * 0.05);
  const cropWidth = Math.round(meta.width! * 0.35);
  const cropHeight = Math.round(meta.height! * 0.70);

  const outPath = path.join(process.cwd(), 'public', 'players', 'jasvir-singh.webp');
  await sharp(buffer)
    .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
    .resize(400, 500, { fit: 'cover', position: 'top' })
    .webp({ quality: 85 })
    .toFile(outPath);

  console.log('Successfully saved Jasvir Singh to', outPath);
}

processJasvir().catch(console.error);
