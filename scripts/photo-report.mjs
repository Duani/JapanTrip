import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('public/images');
const registry = await readFile('scripts/fetch-commons-photos.mjs','utf8');
const tokens = [...registry.matchAll(/\{ id: '([^']+)'(?:, hotel: '([^']+)')?/g)];
let ok = 0;
for (const [,id,hotel] of tokens) {
  const file = path.join(root, hotel?'hotels':'places', `${hotel||id}.jpg`);
  try {const s = await stat(file); if (s.size>1000) {console.log(`✓ ${id}`);ok++;continue;}}catch{}
  console.log(`— ${id} — missing`);
}
console.log(`\nInstalled: ${ok}/${tokens.length}`);
console.log('Tip: after adding authorized photos run `npm run build` and push public/images to GitHub.');
