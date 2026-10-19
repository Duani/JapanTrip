// Verified navigation essentials. No personal booking numbers, QR codes or secrets.
// This file is deliberately separate from the versioned itinerary in Supabase.
// Changes to itinerary (times, destinations, bookings) still go through Admin proposals.
export type HotelAddress = {
  nameJa: string;
  en: string;
  ja: string;
  stationEn: string;
  stationJa: string;
  exit: string;
  taxiHintJa: string;
  source: string;
};

export const hotelAddresses: Record<string, HotelAddress> = {
  'tokyu-stay-shinjuku': {
    nameJa: '東急ステイ新宿',
    en: '3-7-1 Shinjuku, Shinjuku-ku, Tokyo 160-0022, Japan',
    ja: '〒160-0022 東京都新宿区新宿3-7-1',
    stationEn: 'Shinjuku-sanchome', stationJa: '新宿三丁目駅', exit: 'C3',
    taxiHintJa: '東急ステイ新宿（新宿3-7-1）までお願いします。',
    source: 'https://www.tokyustay.co.jp/hotel/SJ/'
  },
  'solaria-kyoto': {
    nameJa: 'ソラリア西鉄ホテル京都プレミア 三条鴨川',
    en: '509 Kamiosakacho, Nakagyo-ku, Kyoto 604-8001, Japan',
    ja: '〒604-8001 京都府京都市中京区木屋町通三条上る上大阪町509',
    stationEn: 'Kyoto Shiyakusho-mae', stationJa: '京都市役所前駅', exit: '1 (elevator: 3)',
    taxiHintJa: '御池通り・木屋町通りの南東角、ソラリア西鉄ホテル京都プレミアまでお願いします。',
    source: 'https://solaria-kyoto.nnr-h.com/access'
  },
  'nohga-ueno': {
    nameJa: 'ノーガホテル 上野 東京',
    en: '2-21-10 Higashiueno, Taito-ku, Tokyo 110-0015, Japan',
    ja: '〒110-0015 東京都台東区東上野2丁目21-10',
    stationEn: 'Ueno', stationJa: '上野駅', exit: 'Tokyo Metro Exit 3 (elevator near 2–3)',
    taxiHintJa: 'ノーガホテル上野東京（東上野2-21-10）までお願いします。',
    source: 'https://www.nohgahotel.com/ueno/en/access/'
  }
};

const stationPairs: Array<[string, string]> = [
  ['Narita Airport', '成田空港駅'],
  ['Airport Terminal 2', '空港第2ビル駅'],
  ['Tokyo Station', '東京駅'],
  ['Shinagawa', '品川駅'],
  ['Kyoto Station', '京都駅'],
  ['Shinjuku-sanchome', '新宿三丁目駅'],
  ['Shinjuku', '新宿駅'],
  ['Harajuku', '原宿駅'],
  ['Meiji-jingumae', '明治神宮前駅'],
  ['Shibuya', '渋谷駅'],
  ['Oshiage', '押上駅'],
  ['Akihabara', '秋葉原駅'],
  ['Ginza', '銀座駅'],
  ['Asakusa', '浅草駅'],
  ['Ueno', '上野駅'],
  ['Keisei-Ueno', '京成上野駅'],
  ['Kyoto Shiyakusho-mae', '京都市役所前駅'],
  ['Sanjo', '三条駅'],
  ['Fushimi-Inari', '伏見稲荷駅'],
  ['Inari Station', '稲荷駅'],
  ['Saga-Arashiyama', '嵯峨嵐山駅'],
  ['Nara', '奈良駅'],
  ['Kintetsu-Nara', '近鉄奈良駅']
];

// Prefer longer station names; preserve output exactly as displayed on signs.
export function findStationNames(text: string): Array<{ en: string; ja: string }> {
  const found: Array<{ en: string; ja: string }> = [];
  const input = text.toLowerCase();
  for (const [en, ja] of [...stationPairs].sort((a, b) => b[0].length - a[0].length)) {
    const pattern = new RegExp(`(^|[^a-z])${en.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
    if (pattern.test(input) && !found.some((s) => s.ja === ja)) found.push({ en, ja });
  }
  return found;
}

// These paths are valid after `npm run images:fetch` installs the JPEGs.
// Files absent on disk gracefully fall back to a placeholder in PlaceImageBlock.
// Photos are public assets; NEVER put personal QR tickets or sensitive documents here.
export const localPhotoByPlaceId: Record<string, string> = {
  'narita-airport': '/images/places/narita-airport.jpg',
  'tokyu-stay-shinjuku-place': '/images/hotels/tokyu-stay-shinjuku.jpg',
  'shinjuku-evening': '/images/places/shinjuku-evening.jpg',
  'meiji-jingu': '/images/places/meiji-jingu.jpg',
  'harajuku-omotesando': '/images/places/harajuku-omotesando.jpg',
  'age3-harajuku': '/images/places/age3-harajuku.jpg',
  'shibuya-crossing': '/images/places/shibuya-crossing.jpg',
  'shibuya-sky': '/images/places/shibuya-sky.jpg',
  'tokyo-skytree': '/images/places/tokyo-skytree.jpg',
  'tsukiji-outer-market': '/images/places/tsukiji-outer-market.jpg',
  'ginza': '/images/places/ginza.jpg',
  'asakusa-sensoji': '/images/places/asakusa-sensoji.jpg',
  'akihabara': '/images/places/akihabara.jpg',
  'shinjuku-shopping': '/images/places/shinjuku-shopping.jpg',
  'shinjuku-gyoen': '/images/places/shinjuku-gyoen.jpg',
  'kyoto-solaria-place': '/images/hotels/solaria-kyoto.jpg',
  'pontocho-kamogawa': '/images/places/pontocho-kamogawa.jpg',
  'fushimi-inari': '/images/places/fushimi-inari.jpg',
  'kiyomizu-higashiyama': '/images/places/kiyomizu-higashiyama.jpg',
  'gion-yasaka': '/images/places/gion-yasaka.jpg',
  'nara-day': '/images/places/nara-day.jpg',
  'arashiyama': '/images/places/arashiyama.jpg',
  'ueno-ameyoko': '/images/places/ueno-ameyoko.jpg'
};

export const localPhotoByHotelId: Record<string, string> = {
  'tokyu-stay-shinjuku': '/images/hotels/tokyu-stay-shinjuku.jpg',
  'solaria-kyoto': '/images/hotels/solaria-kyoto.jpg',
  'nohga-ueno': '/images/hotels/nohga-ueno.jpg'
};
