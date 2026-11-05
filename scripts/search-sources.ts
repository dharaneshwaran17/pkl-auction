import fs from 'node:fs';

async function searchWikipediaImage(playerName: string) {
  const titlesToTry = [
    playerName,
    `${playerName} (kabaddi)`,
    `${playerName} (sportsman)`,
  ];

  for (const title of titlesToTry) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages|info&inprop=url&piprop=original|thumbnail&pithumbsize=600&format=json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
      });
      if (!res.ok) continue;
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) continue;
      for (const pageId of Object.keys(pages)) {
        if (pageId === '-1') continue;
        const page = pages[pageId];
        if (page.original?.source) {
          return {
            title: page.title,
            sourceUrl: page.fullurl,
            imageUrl: page.original.source,
            thumbnailUrl: page.thumbnail?.source,
            source: 'Wikipedia'
          };
        }
      }
    } catch (e) {
      // ignore and try next
    }
  }
  return null;
}

async function searchCommons(query: string) {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|extmetadata&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const info = page.imageinfo?.[0];
      if (info && info.url) {
        return {
          title: page.title,
          sourceUrl: info.descriptionshorturl || info.descriptionurl,
          imageUrl: info.url,
          extmetadata: info.extmetadata,
          source: 'Wikimedia Commons'
        };
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function main() {
  const names = [
    "Ajay Thakur",
    "Anup Kumar",
    "Fazel Atrachali",
    "Rahul Chaudhari",
    "Deepak Niwas Hooda",
    "Manjeet Chhillar",
    "Sandeep Narwal",
    "Naveen Kumar",
    "Sachin Tanwar",
    "Arjun Deshwal",
    "Maninder Singh",
    "Sunil Kumar",
    "Surjeet Singh",
    "Nitesh Kumar",
    "Siddharth Desai",
    "Vikash Kandola",
    "Ashu Malik",
    "Guman Singh",
    "Devank Dalal",
    "Pankaj Mohite"
  ];

  for (const name of names) {
    console.log(`\nSearching for: ${name}...`);
    const wiki = await searchWikipediaImage(name);
    if (wiki) {
      console.log(`  [Wikipedia] Found: ${wiki.title} -> ${wiki.imageUrl}`);
    } else {
      const commons = await searchCommons(`${name} kabaddi`);
      if (commons) {
        console.log(`  [Commons] Found: ${commons.title} -> ${commons.imageUrl}`);
      } else {
        console.log(`  [None] No verified portrait found on Wikipedia/Commons.`);
      }
    }
    await new Promise(r => setTimeout(r, 600));
  }
}

main();
