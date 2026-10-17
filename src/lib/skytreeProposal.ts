import type { Place, RouteLeg, TripData } from '../types';
import type { TripOperation } from './tripPublishing';

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const dirs = (a: string, b: string) => `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(a)}&destination=${encodeURIComponent(b)}&travelmode=transit`;

export function skytreeProposal(data: TripData): TripOperation[] {
  const oldRoute = data.routeLegs.find((route) => route.id === 'tokyo-west-day-flow');
  if (!oldRoute) throw new Error('Missing tokyo-west-day-flow in current itinerary');

  const place: Place = {
    id: 'tokyo-skytree', name: 'Tokyo Skytree', nameHe: 'מגדל Tokyo Skytree',
    nameJa: '東京スカイツリー', category: 'observation', city: 'Tokyo',
    googleMapsUrl: maps('Tokyo Skytree 1-1-2 Oshiage Tokyo'),
    shortDescription: 'תצפית פנורמית על טוקיו לקראת השקיעה והערב. הכרטיסים הוזמנו ל־26.10 בשעה 17:00.',
    whatToDo: ['להגיע לאזור עד 16:30 ולמצוא את כניסת התצפית.', 'להציג כרטיסים אישיים לכל אחד מארבעת הנוסעים.', 'אחרי הביקור אפשר לאכול ב־Tokyo Solamachi.'],
    timeNeededMinutes: 90, bestTimeOfDay: 'evening', bookingRequired: true,
    indoorOutdoor: 'indoor', priority: 'must',
    stationAccess: [{ station: 'Oshiage (Skytree) Station', exit: 'לפי שילוט Tokyo Skytree / Tokyo Solamachi', walkMinutes: 8, lines: ['Tokyo Metro Hanzomon (Z)', 'Toei Asakusa', 'Keisei', 'Tobu'], notes: 'להתקדם לכניסה של Tokyo Skytree בקומה 4; לבדוק בפועל את ההכוונה בשילוט.' }],
    ticketInfo: { requirement: 'reservation-required', notes: ['הוזמן ל־4 אנשים ל־26.10, 17:00. כל QR נשמר פרטית, לא באתר.'] },
    openingHours: { summary: 'הוזמנה כניסה בשעה 17:00; לבדוק תנאי איחור באתר הרשמי.', verifyUrl: 'https://www.tokyo-skytree.jp/en/' },
    visualCues: ['מגדל צר וגבוה מאוד באזור Oshiage', 'מתחם Tokyo Solamachi בבסיס המגדל', 'שילוט TOKYO SKYTREE וקומה 4 לכניסה'],
    images: [{ alt: 'חזית מגדל Tokyo Skytree', caption: 'יש להוסיף תמונה מורשית או צילום משלכם.' }],
    tags: ['tokyo', 'view', 'booked', '2026-10-26']
  };

  const route: RouteLeg = {
    id: 'shibuya-to-skytree-2026-10-26', date: '2026-10-26',
    title: 'Shibuya → Tokyo Skytree (Oshiage)',
    fromLabel: 'Shibuya Station', toLabel: 'Tokyo Skytree', mode: 'train',
    estimatedMinutes: 55, bufferMinutes: 20, ticketNeeded: false,
    ticketNotes: ['כרטיס IC/Suica לתחבורה עירונית. אין צורך להזמין את המטרו מראש.', 'הכניסה ל־Skytree הוזמנה בנפרד ל־17:00.'],
    steps: [
      { order: 1, mode: 'walk', from: 'Shibuya Crossing', to: 'Shibuya Station / Hanzomon line', estimatedMinutes: 10, notes: 'למצוא שילוט Z / Hanzomon.' },
      { order: 2, mode: 'train', from: 'Shibuya Station', to: 'Oshiage (Skytree) Station', line: 'Tokyo Metro Hanzomon (Z)', direction: 'Oshiage', estimatedMinutes: 35, notes: 'קו ישיר; לא נדרשת החלפה. לאמת זמני יציאה באותו יום.' },
      { order: 3, mode: 'walk', from: 'Oshiage Station', to: 'Tokyo Skytree 4F entrance', estimatedMinutes: 10, notes: 'לפי השילוט למתחם Solamachi / כניסה לתצפית.' }
    ],
    googleMapsDirectionsUrl: dirs('Shibuya Station', 'Tokyo Skytree'),
    instructionsShort: 'לצאת משיבויה עד 15:25. קו Hanzomon ישירות ל־Oshiage, הליכה לכניסה ל־Skytree בקומה 4.',
    offlineFallback: 'שלט Z (Hanzomon), כיוון Oshiage. בתחנת Oshiage לחפש Tokyo Skytree / Solamachi. במקרה עיכוב לצאת משיבויה מוקדם יותר.',
    adminStatus: 'ready'
  };

  const westRoute: RouteLeg = {
    ...oldRoute,
    title: 'Shinjuku → Meiji → Harajuku → Shibuya',
    toLabel: 'Shibuya Crossing',
    steps: oldRoute.steps.filter((s) => s.order < 4),
    googleMapsDirectionsUrl: dirs('Tokyu Stay Shinjuku', 'Shibuya Crossing'),
    instructionsShort: 'חצי היום הראשון: Meiji, Harajuku, Age.3 ושיבויה. יוצאים לכיוון Skytree אחר הצהריים.',
    offlineFallback: 'תחנות העוגן: Harajuku (JR Yamanote) → Shibuya; משם Metro Hanzomon אל Oshiage.'
  };

  return [
    { op: 'upsert_place', place },
    { op: 'upsert_route_leg', routeLeg: westRoute },
    { op: 'upsert_route_leg', routeLeg: route },
    { op: 'update_day', dayId: '2026-10-26', patch: {
      title: 'טוקיו: מייג׳י, הרג׳וקו, Age.3, שיבויה ו־Tokyo Skytree',
      summary: 'יום עירוני, עם תצפית מוזמנת ב־Tokyo Skytree בשעה 17:00. קניות ממוקדות; עיקר הקניות נשמר ל־28.10.',
      backupStrategy: 'אם יש עומס, מקצרים Omotesando או Shibuya. לא מתפשרים על שעת Skytree; יוצאים משיבויה עד 15:25.'
    } },
    { op: 'replace_day_blocks', dayId: '2026-10-26', blocks: [
      { id: 'west-route', startTime: '09:15', type: 'transport', routeLegId: 'tokyo-west-day-flow', title: 'מסלול הבוקר בתחבורה', priority: 'recommended' },
      { id: 'meiji', startTime: '09:30', type: 'place', placeId: 'meiji-jingu', title: 'Meiji Jingu', priority: 'must' },
      { id: 'harajuku', startTime: '11:00', type: 'shopping', placeId: 'harajuku-omotesando', title: 'Harajuku / Takeshita Street', notes: 'קניות קצרות; הקניות הארוכות מתוכננות ל־28.10.', priority: 'must' },
      { id: 'age3', startTime: '12:00', type: 'food', placeId: 'age3-harajuku', title: 'Age.3 Harajuku', priority: 'recommended' },
      { id: 'omotesando', startTime: '12:40', type: 'other', title: 'Omotesando ואוכל קל', notes: 'לסיים ולצאת לשיבויה בלי להתעכב.', priority: 'recommended' },
      { id: 'shibuya', startTime: '13:30', type: 'place', placeId: 'shibuya-crossing', title: 'Shibuya Crossing + Hachiko', notes: 'סיום בסביבות 15:20.', priority: 'must' },
      { id: 'route-skytree', startTime: '15:25', type: 'transport', routeLegId: 'shibuya-to-skytree-2026-10-26', title: 'רכבת ל־Tokyo Skytree', priority: 'must' },
      { id: 'skytree', startTime: '17:00', type: 'place', placeId: 'tokyo-skytree', title: 'Tokyo Skytree — הוזמן!', priority: 'must' },
      { id: 'skytree-dinner', startTime: '18:30', type: 'food', title: 'ארוחת ערב באזור Solamachi', notes: 'אופציונלי, ולחזור למלון בשינג׳וקו בהתאם לעייפות.', priority: 'optional' }
    ] },
    { op: 'update_booking_item', id: 'shibuya-sky-booking', patch: {
      status: 'not-needed', priority: 'low', suggestedAction: 'הוחלף ב־Tokyo Skytree, שהוזמן ל־26.10 בשעה 17:00.'
    } },
    { op: 'upsert_booking_item', bookingItem: {
      id: 'tokyo-skytree-2026-10-26', title: 'Tokyo Skytree — 4 כרטיסים ל־17:00',
      category: 'attraction', relatedPlaceId: 'tokyo-skytree', date: '2026-10-26',
      preferredTime: '17:00', status: 'booked', priority: 'high', sensitive: true, owner: 'Elad',
      bookingUrl: 'https://www.tokyo-skytree.jp/en/',
      contacts: [{ type: 'website', label: 'Tokyo Skytree Official', value: 'https://www.tokyo-skytree.jp/en/', url: 'https://www.tokyo-skytree.jp/en/' }],
      suggestedAction: 'להגיע לכניסה באזור 16:30 ולהציג את כרטיסי ה־QR השמורים באופן פרטי.',
      notes: ['4 כרטיסים כבר נקנו.', 'לא לשמור QR או מספרי הזמנה בבסיס נתונים משותף/קוד.']
    } }
  ];
}
