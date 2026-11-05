async function getCategoryMembers(category: string) {
  let cmcontinue: string | undefined = undefined;
  const members: any[] = [];
  do {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('list', 'categorymembers');
    url.searchParams.set('cmtitle', category);
    url.searchParams.set('cmlimit', '500');
    url.searchParams.set('format', 'json');
    if (cmcontinue) {
      url.searchParams.set('cmcontinue', cmcontinue);
    }
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
    });
    if (!res.ok) break;
    const data = await res.json();
    if (data.query?.categorymembers) {
      members.push(...data.query.categorymembers);
    }
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return members;
}

async function main() {
  const cats = [
    'Category:Kabaddi players from India',
    'Category:Kabaddi players',
    'Category:Pro Kabaddi League',
    'Category:Kabaddi in India',
    'Category:Kabaddi competitors at the 2018 Asian Games',
    'Category:Kabaddi competitors at the 2022 Asian Games',
    'Category:Recipients of the Arjuna Award in kabaddi'
  ];

  for (const cat of cats) {
    console.log(`Checking ${cat}...`);
    const members = await getCategoryMembers(cat);
    console.log(`Found ${members.length} members in ${cat}`);
    for (const m of members) {
      console.log(`  - [${m.ns}] ${m.title}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

main().catch(console.error);
