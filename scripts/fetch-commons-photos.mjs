/**
 * One-time photo installer. Downloads downsized, freely licensed Commons photos
 * into public/images/places. Never embeds hotlinks to remote sites in the app.
 * Run locally: npm run images:fetch
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const photos = [
  ['tokyo-skytree', '2019 Tokyo Skytree.jpg'],
  ['harajuku-omotesando', 'Takeshita Street in Harajuku.jpg'],
  ['fushimi-inari', 'FushimiInariTorii.jpg'],
  ['shibuya-crossing', 'Shibuya crossing (12214).jpg'],
  ['meiji-jingu', 'Meiji Jingu entrance.jpg'],
  ['arashiyama', 'Bamboo forest arashiyama.jpg']
];
const outDir = path.resolve('public/images/places');
await mkdir(outDir, { recursive: true });
const credits = ['# Sources and photo credits', '', 'Photos downloaded from Wikimedia Commons. Check each file page for attribution and reuse conditions.', ''];
let count = 0;
for (const [id, filename] of photos) {
  try {
    const pageTitle = `File:${filename}`;
    const query = new URL('https://commons.wikimedia.org/w/api.php');
    query.searchParams.set('action', 'query');
    query.searchParams.set('format', 'json');
    query.searchParams.set('titles', pageTitle);
    query.searchParams.set('prop', 'imageinfo');
    query.searchParams.set('iiprop', 'url|extmetadata|mime');
    query.searchParams.set('iiurlwidth', '850');
    const response = await fetch(query, { headers: { 'User-Agent': 'JapanTripCompanion/1.0 (personal trip planning; photo credits included)' } });
    if (!response.ok) throw new Error(`Commons API HTTP ${response.status}`);
    const result = await response.json();
    const page = Object.values(result.query?.pages ?? {})[0];
    const info = page?.imageinfo?.[0];
    if (!info) throw new Error('Image metadata unavailable');
    const meta = info.extmetadata ?? {};
    const license = String(meta.LicenseShortName?.value ?? '').trim();
    // Fail closed if the file's license cannot be confirmed to be free to use.
    const allowed = /^(CC[\s-]?(BY|0)|Public domain|PD|CC Zero)/i.test(license);
    if (!allowed) throw new Error(`Unverified/non-free license: ${license || '(missing)'}`);
    if (info.mime !== 'image/jpeg') throw new Error(`Unsupported photo format: ${info.mime}`);
    const imageUrl = info.thumburl ?? info.url;
    if (!info.thumburl) throw new Error('No reduced-size thumbnail provided');
    const r = await fetch(imageUrl, { headers: { 'User-Agent': 'JapanTripCompanion/1.0 (photo reuse)' } });
    if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image fetch failed: HTTP ${r.status}`);
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > 3_000_000 || bytes.length < 1000) throw new Error('Image size invalid');
    await writeFile(path.join(outDir, `${id}.jpg`), bytes);
    const author = String(meta.Artist?.value ?? 'See file page').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').slice(0, 250);
    const source = `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename).replace(/%20/g, '_')}`;
    credits.push(`- **${id}**: ${filename}; ${author}; license **${license}**; [file and license details](${source}). Image reduced to 850px using Wikimedia thumbnail service.`);
    count++;
    console.log(`✓ ${id} (${license}, ${(bytes.length/1024).toFixed(0)} KB)`);
  } catch (error) {
    console.warn(`⚠ ${id}: ${error.message}. Kept placeholder, no unknown-license image downloaded.`);
  }
}
await writeFile(path.resolve('PHOTO_CREDITS.md'), credits.join('\n') + '\n');
console.log(`Downloaded ${count}/${photos.length} locally licensed photos. Run npm run build and deploy to include them.`);
