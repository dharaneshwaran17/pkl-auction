async function searchSpecificPlayer(name: string) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(`"${name}"`)}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
  });
  const data = await res.json();
  const pages = data.query?.pages || {};
  return Object.values(pages).map((p: any) => ({
    title: p.title,
    url: p.imageinfo?.[0]?.url,
  }));
}

async function main() {
  const stars = [
    'Deepak Niwas Hooda',
    'Deepak Hooda',
    'Sandeep Narwal',
    'Rakesh Kumar',
    'Manjeet Chhillar',
    'Fazel Atrachali',
    'Naveen Kumar',
    'Arjun Deshwal',
    'Sachin Tanwar',
    'Ajay Thakur',
    'Anup Kumar'
  ];

  for (const s of stars) {
    const res = await searchSpecificPlayer(s);
    console.log(`\n=== ${s} ===`);
    if (res.length === 0) {
      console.log('No files found.');
    } else {
      for (const r of res) {
        console.log(`- ${r.title}`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

main();
