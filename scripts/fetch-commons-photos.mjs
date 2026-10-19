/**
 * Japan Trip Companion photo installer (v6.1).
 * Sources photos only from Wikimedia Commons with permitted free-use licenses.
 * Downloaded images must still be visually reviewed for place accuracy.
 * Usage: npm run images:fetch ; npm run images:report
 *   node scripts/fetch-commons-photos.mjs --dry-run
 *   node scripts/fetch-commons-photos.mjs --id=akihabara
 *   node scripts/fetch-commons-photos.mjs --refresh
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const PLACES = [
  { id: 'narita-airport', query: 'Narita International Airport Terminal 1 exterior', keys: ['narita'], label: 'נמל התעופה נריטה' },
  { id: 'tokyu-stay-shinjuku-place', hotel: 'tokyu-stay-shinjuku', query: 'Tokyu Stay Shinjuku hotel building', keys: ['tokyu stay shinjuku'], label: 'Tokyu Stay Shinjuku' },
  { id: 'shinjuku-evening', query: 'Shinjuku Kabukicho Tokyo at night street', keys: ['shinjuku', 'kabukicho'], label: 'אזור שינג׳וקו בערב' },
  { id: 'meiji-jingu', exact: 'Meiji Jingu entrance.jpg', query: 'Meiji Jingu shrine Harajuku Tokyo', keys: ['meiji jingu', 'meiji shrine'], label: 'מקדש מייג׳י' },
  { id: 'harajuku-omotesando', exact: 'Takeshita Street in Harajuku.jpg', query: 'Takeshita Street Harajuku Tokyo', keys: ['takeshita', 'harajuku'], label: 'רחוב טאקשיטה / הרג׳וקו' },
  { id: 'age3-harajuku', manual: true, query: 'Age.3 Harajuku sandwich', keys: ['age.3 harajuku', 'age3 harajuku'], label: 'Age.3 Harajuku — נדרשת תמונת חזית מקורית/מורשית' },
  { id: 'shibuya-crossing', exact: 'Shibuya crossing (12214).jpg', query: 'Shibuya crossing Tokyo street', keys: ['shibuya crossing', 'shibuya scramble'], label: 'מעבר החציה בשיבויה' },
  { id: 'shibuya-sky', query: 'Shibuya Sky rooftop observation Tokyo', keys: ['shibuya sky'], label: 'Shibuya Sky (לא במסלול המעודכן)' },
  { id: 'tokyo-skytree', exact: '2019 Tokyo Skytree.jpg', query: 'Tokyo Skytree observation tower Japan', keys: ['tokyo skytree', 'skytree'], label: 'Tokyo Skytree' },
  { id: 'tsukiji-outer-market', query: 'Tsukiji outer market Tokyo food street', keys: ['tsukiji'], label: 'שוק צוקיג׳י' },
  { id: 'ginza', query: 'Ginza Chuo Dori Tokyo shopping street', keys: ['ginza'], label: 'גינזה' },
  { id: 'asakusa-sensoji', query: 'Sensoji Kaminarimon Asakusa Tokyo', keys: ['sensoji', 'senso-ji', 'kaminarimon', 'asakusa'], label: 'סנסו־ג׳י / אסקסה' },
  { id: 'akihabara', query: 'Akihabara electric town Tokyo street', keys: ['akihabara'], label: 'אקיהברה' },
  { id: 'shinjuku-shopping', query: 'Shinjuku Tokyo shopping streets at night', keys: ['shinjuku'], label: 'קניות בשינג׳וקו' },
  { id: 'shinjuku-gyoen', query: 'Shinjuku Gyoen National Garden Tokyo', keys: ['shinjuku gyoen'], label: 'גן שינג׳וקו גיואן' },
  { id: 'kyoto-solaria-place', hotel: 'solaria-kyoto', query: 'Solaria Nishitetsu Hotel Kyoto Premier building', keys: ['solaria nishitetsu', 'solaria kyoto'], label: 'מלון Solaria Kyoto' },
  { id: 'pontocho-kamogawa', query: 'Pontocho alley Kyoto Japan', keys: ['pontocho'], label: 'סמטת פונטוצ׳ו בקיוטו' },
  { id: 'fushimi-inari', exact: 'FushimiInariTorii.jpg', query: 'Fushimi Inari torii Kyoto', keys: ['fushimi inari', 'inari torii'], label: 'פושימי אינארי' },
  { id: 'kiyomizu-higashiyama', query: 'Kiyomizudera Kyoto temple view', keys: ['kiyomizu', 'kiyomizudera'], label: 'קיומיזו־דרה' },
  { id: 'gion-yasaka', query: 'Yasaka Shrine Gion Kyoto Japan', keys: ['yasaka', 'gion'], label: 'גיון / מקדש יאסאקה' },
  { id: 'nara-day', query: 'Nara Park deer Todai ji Kyoto Japan', keys: ['nara', 'todai'], label: 'נארה — פארק האיילים' },
  { id: 'arashiyama', exact: 'Bamboo forest arashiyama.jpg', query: 'Arashiyama bamboo forest Kyoto', keys: ['arashiyama'], label: 'יער הבמבוק ארשיאמה' },
  { id: 'ueno-ameyoko', query: 'Ameyoko shopping street Ueno Tokyo', keys: ['ameyoko', 'ameya yokocho'], label: 'שוק אמאיוקו / אואנו' },
  { id: 'nohga-ueno-place', hotel: 'nohga-ueno', query: 'NOHGA Hotel Ueno Tokyo exterior', keys: ['nohga hotel ueno', 'nohga ueno'], label: 'NOHGA Hotel Ueno' }
];
const hotelIds = ['tokyu-stay-shinjuku', 'solaria-kyoto', 'nohga-ueno'];
const arg = (name) => process.argv.some(s => s === name);
const specificId = process.argv.find(s => s.startsWith('--id='))?.split('=')[1];
const dryRun = arg('--dry-run');
const refresh = arg('--refresh');
const skipInactive = !arg('--include-inactive');
const base = path.resolve('public/images');
const targetSpecs = PLACES.filter(s => (!specificId || s.id === specificId || s.hotel === specificId) && (!skipInactive || s.id !== 'shibuya-sky'));
const allResults = [];
const credits = [];
const statuses = [];
const normalize = (s) => s.toLowerCase().replace(/[_()\[\].,-]/g, ' ').replace(/\s+/g, ' ').trim();
const banned = /\b(map|logo|icon|screenshot|poster|diagram|illustration|drawing|floorplan|plan view|model train|ticket|brochure|collage)\b/i;
const unhtml = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();
function isLicensed(license) {
  // NC/ND variants are not suitable for unconditional redistribution in this project.
  if (/\b(?:NC|ND)\b|non.?commercial|no.?derivatives/i.test(license)) return false;
  return /^(?:CC[ -]?BY(?:-SA)?(?:[ -]\d(?:\.\d)?)?|CC[ -]?0(?:[ -]\d(?:\.\d)?)?|Public domain|PD(?:-|\s)|CC Zero)(?:\b|$)/i.test(license);
}
function candidateScore(spec, page) {
  const n = normalize(page.title.replace(/^File:/i, ''));
  if (banned.test(n)) return -999;
  const match = spec.keys.some(key => n.includes(normalize(key)));
  if (!match) return -999; // Critical: don't show another attraction by accident.
  let score = 60;
  const tokens = normalize(spec.query).split(' ').filter(x => x.length > 3);
  score += tokens.filter(x => n.includes(x)).length * 6;
  if (/\b(street|entrance|temple|shrine|exterior|skyline|garden|gate|torii|night|market|station|building|bamboo|deer)\b/.test(n)) score += 8;
  if (/\b(200[0-9]|201[0-9]|202[0-6])\b/.test(n)) score += 3;
  if (/\b(197[0-9]|198[0-9]|199[0-9])\b/.test(n)) score -= 10;
  return score;
}
async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'JapanTripCompanion/1.1 (family itinerary; Wikimedia Commons attribution preserved)' }});
    if (!res.ok) throw Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}
async function pagesFor(spec, queryOverride = null) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query');
  api.searchParams.set('format', 'json');
  api.searchParams.set('generator', 'search');
  api.searchParams.set('gsrsearch', queryOverride ?? spec.query);
  api.searchParams.set('gsrnamespace', '6');
  api.searchParams.set('gsrlimit', '30');
  api.searchParams.set('prop', 'imageinfo');
  api.searchParams.set('iiprop', 'url|extmetadata|mime');
  api.searchParams.set('iiurlwidth', '850');
  const result = await getJson(api);
  return Object.values(result.query?.pages ?? {});
}
async function byExact(filename) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.searchParams.set('action', 'query'); api.searchParams.set('format', 'json');
  api.searchParams.set('titles', `File:${filename}`);
  api.searchParams.set('prop', 'imageinfo'); api.searchParams.set('iiprop', 'url|extmetadata|mime');
  api.searchParams.set('iiurlwidth', '850');
  const result = await getJson(api);
  return Object.values(result.query?.pages ?? {}).filter(p => p.imageinfo?.[0]);
}
function choose(spec, pages) {
  return pages.map(p => ({ p, info: p.imageinfo?.[0], score: candidateScore(spec, p) })).filter(x => {
    const i = x.info; const m = i?.extmetadata ?? {};
    return x.score >= 60 && i?.mime === 'image/jpeg' && i.thumburl &&
      isLicensed(unhtml(m.LicenseShortName?.value)) &&
      unhtml(m.LicenseShortName?.value).length > 0;
  }).sort((a,b) => b.score-a.score)[0];
}
async function fileExists(p) { try { const s = await stat(p); return s.size > 1000; } catch { return false; } }
async function fetchBytes(url) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 40000);
  try {
    const r = await fetch(url, { signal: controller.signal, headers: { 'User-Agent':'JapanTripCompanion/1.1 (family itinerary)' }});
    if (!r.ok || !r.headers.get('content-type')?.startsWith('image/')) throw Error(`image HTTP ${r.status}`);
    const bytes = Buffer.from(await r.arrayBuffer());
    if (bytes.length > 3000000 || bytes.length < 1000) throw Error('image size outside bounds');
    return bytes;
  } finally { clearTimeout(timer); }
}
await mkdir(path.join(base, 'places'), {recursive:true});
await mkdir(path.join(base, 'hotels'), {recursive:true});
const oldCredits = await readFile(path.resolve('PHOTO_CREDITS.md'),'utf8').catch(()=>'');
for (const spec of targetSpecs) {
  const fileId = spec.hotel ?? spec.id;
  const dest = path.join(base, spec.hotel ? 'hotels':'places', `${fileId}.jpg`);
  const rel = `/images/${spec.hotel ? 'hotels':'places'}/${fileId}.jpg`;
  const installed = await fileExists(dest);
  try {
    if (spec.manual) {
      statuses.push({id:spec.id,label:spec.label,state:installed?'manual image present':'needs user photo / permission',path:rel});
      console.log(`○ ${spec.id}: ${installed?'local image exists':'needs user-provided photo'}`);
      continue;
    }
    // Preserve existing files: local images take precedence, never overwrite unexpectedly.
    if (installed && !refresh) {
      statuses.push({id:spec.id,label:spec.label,state:'already installed',path:rel});
      console.log(`✓ ${spec.id}: already installed (kept)`);
      continue;
    }
    let pages = spec.exact ? await byExact(spec.exact) : [];
    let selected = choose(spec,pages);
    if (!selected) { pages = await pagesFor(spec); selected = choose(spec, pages); }
    // Commons full-text search can be too restrictive on longer phrases.
    // Retry by distinctive locality/landmark only, still requiring filename match and free license.
    if (!selected) { pages = await pagesFor(spec, spec.keys[0]); selected = choose(spec, pages); }
    if (!selected && spec.keys.length > 1) { pages = await pagesFor(spec, spec.keys[1]); selected = choose(spec, pages); }
    if (!selected) throw Error('No suitable freely licensed JPEG with matching place name found');
    const {p,info,score} = selected;
    const meta = info.extmetadata;
    const license = unhtml(meta.LicenseShortName?.value);
    const author = unhtml(meta.Artist?.value).slice(0,220) || 'See original file page';
    const source = `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title.replace(/ /g,'_')).replace(/%3A/i, ':')}`;
    const licenseUrl = unhtml(meta.LicenseUrl?.value);
    const detail = {id:spec.id,label:spec.label,state:dryRun?'candidate only':'installed',path:rel,title:p.title,license,licenseUrl,author,source,score};
    if (!dryRun) await writeFile(dest, await fetchBytes(info.thumburl));
    statuses.push(detail); credits.push(detail);
    console.log(`${dryRun?'?':'✓'} ${spec.id}: ${p.title} · ${license}`);
  } catch(e) {
    statuses.push({id:spec.id,label:spec.label,state:installed?'kept existing':'missing',path:rel,error:String(e.message)});
    console.warn(`⚠ ${spec.id}: ${e.message}`);
  }
}
const missing = statuses.filter(s => s.state === 'missing' || s.state.startsWith('needs'));
const successes = statuses.filter(s => s.state === 'installed' || s.state === 'already installed' || s.state === 'manual image present');
const report = [
  '# Japan Trip — photo coverage report',
  '',
  `Installed or preserved: ${successes.length}/${statuses.length} checked locations.`,
  '',
  'NOTE: Every downloaded picture must be visually reviewed before the trip. A matching filename is not proof that the photo shows the correct location/entrance.',
  'For hotels and Age.3, if no exact freely licensed photo is available, use a personally taken or explicitly licensed photo — do not substitute a picture of another hotel.',
  '',
  ...statuses.map(s => `- **${s.label}** (\`${s.id}\`): ${s.state}${s.title ? `; ${s.title}`:''}${s.error ? `; ${s.error}`:''}. Expected: \`${s.path}\``),
  '',
  'To fill a missing image yourself: save an authorized JPEG with the expected filename shown above. Do not add booking QR codes, faces without permission, or credentials to public images.',
  '',
  'Review image attribution in PHOTO_CREDITS.md and public/images/photo-credits.html.'
].join('\n');
if (!dryRun) {
  await writeFile(path.resolve('PHOTO_REPORT.md'), report+'\n');
  // Carry forward v6 credit lines for preserved photos; new items also include verified credits.
  const historical = oldCredits.trim() ? oldCredits.replace(/^# Sources and photo credits\s*/,'').trim() : '';
  const md = ['# Sources and photo credits','', 'Images from Wikimedia Commons; confirm exact attribution on original file pages.', '',
    ...credits.map(c=>`- **${c.id}** — [${c.title}](${c.source}); author: ${c.author}; license: ${c.license}${c.licenseUrl? ` ([license](${c.licenseUrl}))`:''}; resized from Commons thumbnail (850px).`),
    '', ...(historical ? ['## v6 previously downloaded files (preserved)', '', historical] : []),
    '', 'Custom/own photos must have attribution documented separately if required.'];
  await writeFile(path.resolve('PHOTO_CREDITS.md'), md.join('\n')+'\n');
  // Public attribution is important: root README files are not part of the deployed site.
  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const html = ['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Japan Trip — Image credits</title>',
    '<style>body{font-family:system-ui,sans-serif;max-width:850px;margin:auto;padding:20px;line-height:1.6}li{margin:12px 0}</style><h1>Image credits</h1><p>Photos reduced to 850px wide; see original files for license terms.</p><ul>',
    ...credits.map(c=>`<li><b>${esc(c.id)}</b>: <a href="${esc(c.source)}">${esc(c.title)}</a> · ${esc(c.author)} · ${esc(c.license)} ${c.licenseUrl?`(<a href="${esc(c.licenseUrl)}">license</a>)`:''}</li>`),
    '</ul>', historical ? `<h2>Earlier v6 photos (preserved)</h2><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(historical)}</pre>` : '', '</html>'].join('\n');
  await writeFile(path.join(base,'photo-credits.html'),html);
  await writeFile(path.join(base,'photo-coverage.json'),JSON.stringify(statuses,null,2)+'\n');
}
console.log(`\n${successes.length}/${statuses.length} available/preserved. Missing or manual: ${missing.length}.`);
console.log(`See PHOTO_REPORT.md for missing IDs and exact filenames. Always review photos visually.`);
