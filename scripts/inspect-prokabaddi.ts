async function test() {
  const url = "https://www.prokabaddi.com/players/maninder-singh-profile-143";
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
  const html = await res.text();
  
  // Find player image in the hero section of the profile
  // Look for <img> tags in the player profile banner
  const profileMatches = html.match(/<img[^>]+class="[^"]*player[^"]*"[^>]*>/gi) || [];
  console.log("Player img tags:", profileMatches);

  // Look for any png/jpg containing player name or ID
  const allImgs = html.match(/https?:\/\/[^"'\s<>]+\.(?:png|jpg|jpeg|webp)[^"'\s<>]*/gi) || [];
  console.log("All image matches count:", allImgs.length);
  const playerAssets = allImgs.filter(u => u.includes("players") || u.includes("profile") || u.includes("143") || u.includes("squad"));
  console.log("Player related image URLs:", playerAssets);

  // Check nuxt state
  const nuxtMatch = html.match(/window\.__NUXT__\s*=\s*([^;]+);/);
  if (nuxtMatch) {
    console.log("Found __NUXT__ length:", nuxtMatch[1].length);
    // Find image urls inside nuxt state
    const nuxtImages = nuxtMatch[1].match(/"[^"]*waf-images[^"]*"/gi) || [];
    console.log("waf-images in __NUXT__:", nuxtImages.slice(0, 10));
  }
}
test().catch(console.error);
