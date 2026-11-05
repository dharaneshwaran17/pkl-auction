async function getCategoryMembers(category: string) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'categorymembers');
  url.searchParams.set('cmtitle', category);
  url.searchParams.set('cmlimit', '100');
  url.searchParams.set('format', 'json');
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
  });
  const data = await res.json();
  return data.query?.categorymembers || [];
}

async function main() {
  const cats = [
    'Category:Ajay Thakur',
    'Category:Jasvir Singh (kabaddi)',
    'Category:Telugu Titans',
    'Category:U Mumba',
    'Category:Abhilasha Mhatre',
    'Category:Navneet Gautam',
    'Category:Kasinatha Baskaran'
  ];

  for (const cat of cats) {
    const members = await getCategoryMembers(cat);
    console.log(`\n=== ${cat} (${members.length}) ===`);
    for (const m of members) {
      console.log(`  - [ns:${m.ns}] ${m.title}`);
    }
  }
}

main().catch(console.error);
