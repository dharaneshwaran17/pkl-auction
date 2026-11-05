async function checkWikidata(personName: string) {
  // 1. Search for item ID on wikidata
  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(personName)}&language=en&format=json`;
  const res = await fetch(searchUrl, { headers: { "User-Agent": "PKLAuctionBot/1.0 (contact: admin@pk-auction.local)" } });
  const data = await res.json();
  if (!data.search || data.search.length === 0) {
    return { name: personName, found: false, reason: "No Wikidata entity" };
  }

  // Find the entity that matches kabaddi
  const match = data.search.find((item: any) => 
    (item.description && item.description.toLowerCase().includes("kabaddi")) ||
    (item.label && item.label.toLowerCase() === personName.toLowerCase())
  ) || data.search[0];

  const entityId = match.id;

  // 2. Query claims for P18 (image)
  const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${entityId}&property=P18&format=json`;
  const claimsRes = await fetch(entityUrl, { headers: { "User-Agent": "PKLAuctionBot/1.0" } });
  const claimsData = await claimsRes.json();
  const claims = claimsData.claims?.P18;

  if (!claims || claims.length === 0) {
    return { name: personName, entityId, label: match.label, description: match.description, hasImage: false, reason: "Wikidata entity has no P18 image" };
  }

  const imageName = claims[0].mainsnak?.datavalue?.value;
  return {
    name: personName,
    entityId,
    label: match.label,
    description: match.description,
    hasImage: true,
    imageName,
  };
}

async function main() {
  const testNames = [
    "Pawan Sehrawat",
    "Pardeep Narwal",
    "Naveen Kumar",
    "Fazel Atrachali",
    "Ajay Thakur",
    "Anup Kumar",
    "Rahul Chaudhari",
    "Manjeet Chhillar",
    "Deepak Niwas Hooda",
    "Sandeep Narwal",
    "Sachin Tanwar",
    "Arjun Deshwal",
    "Maninder Singh",
    "Sunil Kumar",
    "Surjeet Singh",
    "Nitesh Kumar",
    "Siddharth Desai",
    "Vikash Kandola",
    "Ashu Malik",
    "Guman Singh"
  ];

  console.log("Checking Wikidata for 20 players...");
  for (const name of testNames) {
    const result = await checkWikidata(name);
    console.log(result.name, "=>", result.hasImage ? `IMAGE: ${result.imageName}` : `NO IMAGE (${result.reason})`);
    await new Promise(r => setTimeout(r, 200));
  }
}

main().catch(console.error);
