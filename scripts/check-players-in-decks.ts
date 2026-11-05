import { PKL_250_PLAYERS } from '../src/lib/auction/pkl250Players';
import { REAL_PKL_PLAYERS } from '../src/lib/auction/roster';

const checkNames = ['Navneet Gautam', 'Jasvir Singh', 'Dinesh Kumar', 'Ashu Malik'];

for (const name of checkNames) {
  const in250 = PKL_250_PLAYERS.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
  const in80 = REAL_PKL_PLAYERS.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
  console.log(`${name}: in250=${!!in250} (${in250?.name}), in80=${!!in80} (${in80?.name})`);
}
