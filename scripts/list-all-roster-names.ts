import { REAL_PKL_PLAYERS } from '../src/lib/auction/roster';
import { prisma } from '../src/lib/prisma';

async function main() {
  const dbPlayers = await prisma.player.findMany({
    select: { id: true, name: true, role: true, basePrice: true, status: true }
  });

  console.log(`DB Players: ${dbPlayers.length}`);
  console.log(`REAL_PKL_PLAYERS: ${REAL_PKL_PLAYERS.length}`);

  const allNames = new Set([
    ...dbPlayers.map(p => p.name),
    ...REAL_PKL_PLAYERS.map(p => p.name)
  ]);

  console.log(`Total unique names to consider: ${allNames.size}`);
  const sortedNames = Array.from(allNames).sort();
  console.log(JSON.stringify(sortedNames, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
