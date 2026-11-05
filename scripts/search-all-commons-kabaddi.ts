async function searchCommonsFiles(query: string) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=50&prop=imageinfo&iiprop=url|extmetadata&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
  });
  const data = await res.json();
  const pages = data.query?.pages || {};
  return Object.values(pages).map((p: any) => ({
    title: p.title,
    url: p.imageinfo?.[0]?.url,
    description: p.imageinfo?.[0]?.extmetadata?.ImageDescription?.value
  }));
}

async function main() {
  const queries = [
    'Arjuna Award kabaddi',
    'kabaddi "President"',
    'kabaddi "Asian Games"',
    'kabaddi "Padma Shri"',
    'pro kabaddi league player'
  ];

  for (const q of queries) {
    console.log(`\n=== Query: ${q} ===`);
    const results = await searchCommonsFiles(q);
    console.log(`Found ${results.length} files:`);
    for (const r of results) {
      console.log(`- ${r.title}`);
    }
  }
}

main();
