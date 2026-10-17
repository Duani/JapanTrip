import type { BookingItem, DayBlock, DayPlan, Place, RouteLeg, TripData } from '../types';
import { requireSupabase } from './supabaseClient';

/** Restricted set of itinerary mutations. Nothing executes arbitrary code or SQL. */
export type TripOperation =
  | { op: 'update_day'; dayId: string; patch: Pick<DayPlan, 'title' | 'summary' | 'backupStrategy'> }
  | { op: 'replace_day_blocks'; dayId: string; blocks: DayBlock[] }
  | { op: 'upsert_place'; place: Place }
  | { op: 'upsert_route_leg'; routeLeg: RouteLeg }
  | { op: 'upsert_booking_item'; bookingItem: BookingItem }
  | { op: 'update_booking_item'; id: string; patch: Partial<BookingItem> };

function object(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function requiredString(v: unknown, field: string): asserts v is string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`שדה לא תקין: ${field}`);
}
function mustFind<T extends { id: string }>(items: T[], id: string, label: string): T {
  const item = items.find((v) => v.id === id);
  if (!item) throw new Error(`${label} לא נמצא: ${id}`);
  return item;
}
function upsert<T extends { id: string }>(items: T[], next: T) {
  const ix = items.findIndex((item) => item.id === next.id);
  if (ix < 0) items.push(next);
  else items[ix] = next;
}

export function applyTripOperations(initial: TripData, operations: unknown): TripData {
  if (!Array.isArray(operations) || operations.length > 30) throw new Error('Operations חייב להיות מערך של עד 30 פעולות');
  const next: TripData = JSON.parse(JSON.stringify(initial));
  for (const raw of operations) {
    if (!object(raw)) throw new Error('פעולה לא תקינה');
    switch (raw.op) {
      case 'update_day': {
        requiredString(raw.dayId, 'dayId');
        if (!object(raw.patch)) throw new Error('חסר patch ליום');
        const day = mustFind(next.days, raw.dayId, 'יום');
        const allowed = ['title', 'summary', 'backupStrategy'];
        for (const [key, value] of Object.entries(raw.patch)) {
          if (!allowed.includes(key) || typeof value !== 'string') throw new Error(`אסור לעדכן שדה יום: ${key}`);
        }
        Object.assign(day, raw.patch);
        break;
      }
      case 'replace_day_blocks': {
        requiredString(raw.dayId, 'dayId');
        if (!Array.isArray(raw.blocks) || !raw.blocks.length) throw new Error('חסר מערך blocks');
        const day = mustFind(next.days, raw.dayId, 'יום');
        const ids = new Set<string>();
        for (const block of raw.blocks) {
          if (!object(block)) throw new Error('בלוק לא תקין');
          requiredString(block.id, 'block.id');
          requiredString(block.title, 'block.title');
          if (!['place','food','transport','rest','hotel','optional','shopping','other'].includes(String(block.type))) throw new Error(`סוג בלוק לא תקין ${block.id}`);
          if (!['must','recommended','optional'].includes(String(block.priority))) throw new Error(`עדיפות לא תקינה ${block.id}`);
          if (ids.has(block.id)) throw new Error(`בלוק כפול: ${block.id}`);
          ids.add(block.id);
        }
        day.blocks = raw.blocks as DayBlock[];
        break;
      }
      case 'upsert_place': {
        if (!object(raw.place)) throw new Error('חסר place');
        requiredString(raw.place.id, 'place.id');
        requiredString(raw.place.name, 'place.name');
        requiredString(raw.place.nameHe, 'place.nameHe');
        if (!Array.isArray(raw.place.whatToDo) || !Array.isArray(raw.place.tags)) throw new Error('שדות place חסרים');
        upsert(next.places, raw.place as Place);
        break;
      }
      case 'upsert_route_leg': {
        if (!object(raw.routeLeg)) throw new Error('חסר routeLeg');
        requiredString(raw.routeLeg.id, 'routeLeg.id');
        requiredString(raw.routeLeg.title, 'routeLeg.title');
        if (!Array.isArray(raw.routeLeg.steps)) throw new Error('routeLeg.steps חסר');
        upsert(next.routeLegs, raw.routeLeg as RouteLeg);
        break;
      }
      case 'upsert_booking_item': {
        if (!object(raw.bookingItem)) throw new Error('חסר bookingItem');
        requiredString(raw.bookingItem.id, 'bookingItem.id');
        requiredString(raw.bookingItem.title, 'bookingItem.title');
        if (!Array.isArray(raw.bookingItem.notes)) throw new Error('bookingItem.notes חסר');
        upsert(next.bookingItems, raw.bookingItem as BookingItem);
        break;
      }
      case 'update_booking_item': {
        requiredString(raw.id, 'id');
        if (!object(raw.patch)) throw new Error('חסר patch להזמנה');
        const item = mustFind(next.bookingItems, raw.id, 'הזמנה');
        const allowed = ['title', 'status', 'preferredTime', 'suggestedAction', 'priority', 'notes', 'bookingUrl'];
        for (const key of Object.keys(raw.patch)) {
          if (!allowed.includes(key)) throw new Error(`אסור לשנות שדה הזמנה: ${key}`);
        }
        if (raw.patch.status && !['not-needed','to-check','to-book','booked','cancelled'].includes(String(raw.patch.status))) throw new Error('סטטוס הזמנה לא תקין');
        Object.assign(item, raw.patch);
        break;
      }
      default:
        throw new Error(`פעולה לא נתמכת: ${String(raw.op)}`);
    }
  }
  for (const day of next.days) {
    for (const block of day.blocks) {
      if (block.placeId) mustFind(next.places, block.placeId, 'מקום');
      if (block.routeLegId) mustFind(next.routeLegs, block.routeLegId, 'מעבר');
    }
  }
  return next;
}

export async function getPublishedTrip(tripId: string): Promise<{ trip: TripData; version: number } | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('trip_versions')
    .select('version_number, data_snapshot').eq('trip_id', tripId).eq('status', 'published')
    .order('version_number', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const snapshot = data.data_snapshot as TripData;
  if (snapshot?.trip?.id !== tripId || !Array.isArray(snapshot.days)) throw new Error('גרסה שמורה לא תקינה');
  return { trip: snapshot, version: data.version_number as number };
}

/** Atomic DB operation. A stale-version or unauthorized publish fails server-side. */
export async function publishTrip(tripId: string, snapshot: TripData, expectedVersion: number, proposalId: string | null) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('publish_trip_snapshot', {
    p_trip_id: tripId,
    p_snapshot: snapshot,
    p_expected_version: expectedVersion,
    p_proposal_id: proposalId
  });
  if (error) throw error;
  return data as number;
}
