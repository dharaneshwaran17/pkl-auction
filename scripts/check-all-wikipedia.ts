import { REAL_PKL_PLAYERS } from '../src/lib/auction/roster';
import { prisma } from '../src/lib/prisma';

async function checkWikipedia(name: string) {
  const cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
  const variations = [
    cleanName,
    `${cleanName} (kabaddi)`,
    `${cleanName} (kabaddi player)`
  ];

  for (const title of variations) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages|extracts&piprop=original|thumbnail&pithumbsize=600&exintro=1&explaintext=1&format=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;
      for (const k of Object.keys(pages)) {
        if (k === '-1') continue;
        const page = pages[k];
        const extract = (page.extract || '').toLowerCase();
        if (extract.includes('kabaddi')) {
          return {
            name,
            cleanName,
            matchedTitle: page.title,
            imageUrl: page.original?.source || page.thumbnail?.source || null,
            extractSnippet: extract.slice(0, 150)
          };
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return { name, cleanName, matchedTitle: null, imageUrl: null, extractSnippet: '' };
}

async function main() {
  const dbPlayers = await prisma.player.findMany({ select: { id: true, name: true } });
  const allNames = Array.from(new Set([
    ...dbPlayers.map(p => p.name),
    ...REAL_PKL_PLAYERS.map(p => p.name)
  ])).sort();

  console.log(`Checking Wikipedia articles for all ${allNames.length} names...`);
  const foundWithImages: any[] = [];
  const foundWithoutImages: any[] = [];
  const notFound: any[] = [];

  for (let i = 0; i < allNames.length; i++) {
    const name = allNames[i];
    const res = await checkWikipedia(name);
    if (res.imageUrl) {
      console.log(`[${i+1}/${allNames.length}] IMAGE FOUND: ${res.cleanName} -> ${res.imageUrl}`);
      foundWithImages.push(res);
    } else if (res.matchedTitle) {
      console.log(`[${i+1}/${allNames.length}] ARTICLE FOUND NO IMAGE: ${res.cleanName} (${res.matchedTitle})`);
      foundWithoutImages.push(res);
    } else {
      notFound.push(res.cleanName);
    }
    // Respect rate limit
    await new Promise(r => setTimeout(r, 250));
  }

  console.log('\n--- SUMMARY ---');
  console.log(`With Image: ${foundWithImages.length}`);
  console.log(`Article Exists but No Image: ${foundWithoutImages.length}`);
  console.log(`No Kabaddi Article on Wikipedia: ${notFound.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
