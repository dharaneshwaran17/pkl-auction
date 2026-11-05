async function getDirectUrl(title: string) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'PKLAuctionViewerBot/1.0 (contact: admin@pk-auction.local)' }
  });
  const data = await res.json();
  const pages = data.query?.pages;
  console.log(JSON.stringify(pages, null, 2));
}

getDirectUrl('File:The President, Shri Ram Nath Kovind presenting the Arjuna Award, 2017 to Shri Jasvir Singh for Kabaddi, in a glittering ceremony, at Rashtrapati Bhavan, in New Delhi on August 29, 2017.jpg');
