export type TripMemberRole = 'admin' | 'editor' | 'viewer';

export type Traveler = {
  id: string;
  displayName: string;
  role: TripMemberRole;
};

export type Trip = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  timezone: 'Asia/Tokyo';
  defaultLanguage: 'he';
  travelers: Traveler[];
};

export type City = 'Tokyo' | 'Kyoto' | 'Osaka' | 'Nara' | 'Narita' | 'Transit';

export type PlaceCategory =
  | 'temple'
  | 'shrine'
  | 'garden'
  | 'neighborhood'
  | 'observation'
  | 'museum'
  | 'station'
  | 'hotel'
  | 'food'
  | 'shopping'
  | 'experience'
  | 'other';

export type StationAccess = {
  station: string;
  stationJa?: string;
  lines?: string[];
  exit?: string;
  walkMinutes?: number;
  notes?: string;
};

export type TicketRequirement =
  | 'none'
  | 'onsite'
  | 'online-recommended'
  | 'reservation-required'
  | 'included-in-tour'
  | 'to-check';

export type TicketInfo = {
  requirement: TicketRequirement;
  priceHint?: string;
  bookingUrl?: string;
  notes?: string[];
};

export type OpeningHours = {
  summary: string;
  lastEntry?: string;
  closed?: string;
  verifyUrl?: string;
  lastVerified?: string;
  notes?: string[];
};

export type PlaceImage = {
  url?: string;
  alt: string;
  caption?: string;
  sourceLabel?: string;
  sourceUrl?: string;
};

export type Place = {
  id: string;
  name: string;
  nameHe: string;
  nameJa?: string;
  category: PlaceCategory;
  city: City;
  lat?: number;
  lng?: number;
  googleMapsUrl: string;
  shortDescription: string;
  whatToDo: string[];
  timeNeededMinutes: number;
  bestTimeOfDay?: 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
  bookingRequired: boolean;
  indoorOutdoor: 'indoor' | 'outdoor' | 'mixed';
  priority: 'must' | 'recommended' | 'optional' | 'backup';
  stationAccess?: StationAccess[];
  ticketInfo?: TicketInfo;
  openingHours?: OpeningHours;
  visualCues?: string[];
  images?: PlaceImage[];
  tags: string[];
};

export type Hotel = {
  id: string;
  name: string;
  city: 'Tokyo' | 'Kyoto';
  checkInDate: string;
  checkOutDate: string;
  googleMapsUrl: string;
  address?: string;
  nearestStation?: string;
  notes: string[];
};

export type TransportMode = 'walk' | 'train' | 'bus' | 'taxi' | 'shinkansen' | 'airport-train' | 'other';

export type RouteStep = {
  order: number;
  mode: TransportMode;
  from: string;
  to: string;
  line?: string;
  direction?: string;
  estimatedMinutes?: number;
  notes?: string;
};

export type RouteLeg = {
  id: string;
  date?: string;
  title: string;
  fromPlaceId?: string;
  toPlaceId?: string;
  fromLabel: string;
  toLabel: string;
  mode: TransportMode;
  estimatedMinutes: number;
  bufferMinutes: number;
  ticketNeeded: boolean;
  ticketNotes: string[];
  steps: RouteStep[];
  googleMapsDirectionsUrl: string;
  instructionsShort: string;
  offlineFallback: string;
  adminStatus: 'ready' | 'needs-live-check' | 'needs-booking' | 'draft';
};

export type DayBlock = {
  id: string;
  startTime?: string;
  endTime?: string;
  type: 'place' | 'food' | 'transport' | 'rest' | 'hotel' | 'optional' | 'shopping' | 'other';
  placeId?: string;
  routeLegId?: string;
  title: string;
  notes?: string;
  priority: 'must' | 'recommended' | 'optional';
};

export type GuideDay = {
  guideName?: string;
  guideContact?: string;
  guideFocus: string;
  flexibleRoute: boolean;
  adminNotes?: string[];
};

export type DayPlan = {
  id: string;
  date: string;
  title: string;
  city: City;
  hotelId?: string;
  summary: string;
  mood: 'arrival' | 'classic' | 'culture' | 'nature' | 'transit' | 'last-day' | 'mixed';
  guideDay?: GuideDay;
  blocks: DayBlock[];
  backupStrategy: string;
};

export type BookingContact = {
  type: 'website' | 'email' | 'phone' | 'whatsapp' | 'hotel' | 'guide' | 'other';
  label: string;
  value: string;
  url?: string;
};

export type BookingItem = {
  id: string;
  title: string;
  category: 'attraction' | 'transport' | 'restaurant' | 'hotel' | 'admin' | 'tour' | 'experience' | 'other';
  relatedPlaceId?: string;
  relatedRouteLegId?: string;
  date?: string;
  preferredTime?: string;
  status: 'not-needed' | 'to-check' | 'to-book' | 'booked' | 'cancelled';
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
  bookingUrl?: string;
  contacts?: BookingContact[];
  confirmationRef?: string;
  sensitive: boolean;
  owner?: string;
  suggestedAction: string;
  notes: string[];
};

export type PlanBOption = {
  id: string;
  dayId: string;
  trigger: 'rain' | 'too-tired' | 'running-late' | 'place-closed' | 'too-crowded' | 'low-connectivity';
  title: string;
  description: string;
  replacementPlaceIds: string[];
  decisionRule: string;
};

export type UserTripState = {
  userId: string;
  tripId: string;
  currentDayId?: string;
  currentCheckpointPlaceId?: string;
  completedPlaceIds: string[];
  skippedPlaceIds: string[];
  notesByPlaceId: Record<string, string>;
  lastSyncedAt?: string;
};

export type TripData = {
  trip: Trip;
  hotels: Hotel[];
  places: Place[];
  routeLegs: RouteLeg[];
  days: DayPlan[];
  bookingItems: BookingItem[];
  planBOptions: PlanBOption[];
};
