import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { tripData } from './data/tripData';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import { createChangeProposal, listChangeProposals, type ChangeProposalRow } from './lib/proposals';
import type { BookingItem, DayPlan, OpeningHours, Place, RouteLeg, StationAccess, TicketInfo, TripMemberRole } from './types';
import './styles.css';

const placeById = new Map(tripData.places.map((place) => [place.id, place]));
const hotelById = new Map(tripData.hotels.map((hotel) => [hotel.id, hotel]));
const routeById = new Map(tripData.routeLegs.map((route) => [route.id, route]));

type Tab = 'today' | 'itinerary' | 'bookings' | 'transport' | 'admin';

type Membership = {
  trip_id: string;
  display_name: string;
  role: TripMemberRole;
};

function App() {
  const [selectedDayId, setSelectedDayId] = useState('2026-10-26');
  const [tab, setTab] = useState<Tab>('today');
  const [user, setUser] = useState<User | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  const selectedDay = useMemo(
    () => tripData.days.find((day) => day.id === selectedDayId) ?? tripData.days[0],
    [selectedDayId]
  );

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setAuthMessage(error.message);
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setMembership(null);
      return;
    }

    setMembershipLoading(true);
    setAuthMessage(null);

    supabase
      .from('trip_members')
      .select('trip_id, display_name, role')
      .eq('trip_id', tripData.trip.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setAuthMessage(error.message);
          setMembership(null);
        } else {
          setMembership((data as Membership | null) ?? null);
        }
        setMembershipLoading(false);
      });
  }, [user]);

  if (authLoading) {
    return <LoadingScreen text="בודק התחברות מול Supabase..." />;
  }

  if (isSupabaseConfigured && !user) {
    return <LoginScreen message={authMessage} />;
  }

  if (isSupabaseConfigured && user && membershipLoading) {
    return <LoadingScreen text="בודק הרשאות לטיול..." />;
  }

  if (isSupabaseConfigured && user && !membership) {
    return <NotMemberScreen user={user} message={authMessage} />;
  }

  const effectiveMembership = membership ?? {
    trip_id: tripData.trip.id,
    display_name: 'Demo Admin',
    role: 'admin' as TripMemberRole
  };

  return (
    <main className="app-shell" dir="rtl">
      {!isSupabaseConfigured && <SupabaseSetupBanner />}
      <AppHeader activeTab={tab} onChangeTab={setTab} user={user} membership={effectiveMembership} />

      {tab === 'today' && (
        <div className="two-column-shell">
          <DayPicker selectedDayId={selectedDayId} onSelectDay={setSelectedDayId} />
          <DayView day={selectedDay} />
        </div>
      )}

      {tab === 'itinerary' && <ItineraryOverview onSelectDay={(dayId) => { setSelectedDayId(dayId); setTab('today'); }} />}
      {tab === 'bookings' && <BookingCenter />}
      {tab === 'transport' && <TransportCenter />}
      {tab === 'admin' && <AdminPanel user={user} membership={effectiveMembership} />}
    </main>
  );
}

function AppHeader({ activeTab, onChangeTab, user, membership }: { activeTab: Tab; onChangeTab: (tab: Tab) => void; user: User | null; membership: Membership }) {
  const urgentBookings = tripData.bookingItems.filter((item) => item.status === 'to-book' || item.status === 'to-check').length;
  return (
    <header className="app-header">
      <div className="hero-copy">
        <p className="eyebrow" dir="ltr">Japan Trip Companion</p>
        <h1>טיול יפן 2026</h1>
        <p>
          <span dir="ltr">{tripData.trip.startDate} → {tripData.trip.endDate}</span>
          {' · '}
          {tripData.trip.travelers.map((t) => t.displayName).join(' · ')}
        </p>
      </div>
      <div className="hero-status-grid">
        <Metric label="ימים" value={String(tripData.days.length)} />
        <Metric label="הזמנות לבדיקה" value={String(urgentBookings)} tone="warning" />
        <Metric label="לילות" value="Tokyo · Kyoto · Tokyo" dir="ltr" />
      </div>
      <AuthBadge user={user} membership={membership} />
      <nav className="top-tabs" aria-label="ניווט ראשי">
        <TabButton tab="today" activeTab={activeTab} onChangeTab={onChangeTab}>היום במסלול</TabButton>
        <TabButton tab="itinerary" activeTab={activeTab} onChangeTab={onChangeTab}>כל הימים</TabButton>
        <TabButton tab="bookings" activeTab={activeTab} onChangeTab={onChangeTab}>הזמנות מראש</TabButton>
        <TabButton tab="transport" activeTab={activeTab} onChangeTab={onChangeTab}>רכבות ומעברים</TabButton>
        <TabButton tab="admin" activeTab={activeTab} onChangeTab={onChangeTab}>Admin</TabButton>
      </nav>
    </header>
  );
}

function Metric({ label, value, tone, dir }: { label: string; value: string; tone?: 'warning'; dir?: 'ltr' }) {
  return (
    <div className={tone === 'warning' ? 'metric warning' : 'metric'}>
      <span>{label}</span>
      <strong dir={dir}>{value}</strong>
    </div>
  );
}

function TabButton({ tab, activeTab, onChangeTab, children }: { tab: Tab; activeTab: Tab; onChangeTab: (tab: Tab) => void; children: React.ReactNode }) {
  return (
    <button className={activeTab === tab ? 'tab-button active' : 'tab-button'} onClick={() => onChangeTab(tab)}>
      {children}
    </button>
  );
}

function DayPicker({ selectedDayId, onSelectDay }: { selectedDayId: string; onSelectDay: (dayId: string) => void }) {
  return (
    <aside className="day-rail panel">
      <h2>בחירת יום</h2>
      <p className="muted">בחרו יום כדי לראות רק את הכרטיסיות והרכבות שקשורות אליו.</p>
      <div className="day-button-list">
        {tripData.days.map((day) => (
          <button
            key={day.id}
            className={day.id === selectedDayId ? 'day-button active' : 'day-button'}
            onClick={() => onSelectDay(day.id)}
          >
            <span>{formatHebrewDate(day.date)}</span>
            <strong>{day.title}</strong>
            <small>{day.city}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function DayView({ day }: { day: DayPlan }) {
  const hotel = day.hotelId ? hotelById.get(day.hotelId) : undefined;
  const routeCount = day.blocks.filter((block) => block.routeLegId).length;

  return (
    <section className="day-main panel">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">היום שנבחר</p>
          <h2>{day.title}</h2>
        </div>
        <span className="city-chip">{day.city}</span>
      </div>
      <p className="summary">{day.summary}</p>

      <div className="day-meta-grid">
        {hotel && <MetaPill label="לינה" value={hotel.name} url={hotel.googleMapsUrl} />}
        <MetaPill label="מעברים ביום" value={`${routeCount} Route cards`} dir="ltr" />
        <MetaPill label="מצב" value={moodLabel(day.mood)} />
      </div>

      {day.guideDay && <GuideBox day={day} />}

      <div className="timeline">
        {day.blocks.map((block) => {
          const place = block.placeId ? placeById.get(block.placeId) : undefined;
          const route = block.routeLegId ? routeById.get(block.routeLegId) : undefined;
          return (
            <article key={block.id} className="timeline-item">
              <div className="time-column" dir="ltr">{block.startTime ?? '—'}</div>
              <div className="timeline-content">
                <div className="block-title-row">
                  <div>
                    <h3>{block.title}</h3>
                    {block.notes && <p className="muted" dir="auto">{block.notes}</p>}
                  </div>
                  <span className={`priority-chip ${block.priority}`}>{priorityLabel(block.priority)}</span>
                </div>
                {route && <RouteCard route={route} compact={false} />}
                {place && <PlaceCard place={place} />}
              </div>
            </article>
          );
        })}
      </div>

      <div className="backup-box">
        <strong>Plan B:</strong> <span>{day.backupStrategy}</span>
      </div>
    </section>
  );
}

function GuideBox({ day }: { day: DayPlan }) {
  if (!day.guideDay) return null;
  return (
    <section className="guide-box">
      <strong>יום עם מדריכה</strong>
      <p>{day.guideDay.guideFocus}</p>
      {day.guideDay.adminNotes?.length ? (
        <ul>
          {day.guideDay.adminNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

function MetaPill({ label, value, url, dir }: { label: string; value: string; url?: string; dir?: 'ltr' }) {
  return (
    <div className="meta-pill">
      <span>{label}</span>
      {url ? <a href={url} target="_blank" rel="noreferrer" dir={dir}>{value}</a> : <strong dir={dir}>{value}</strong>}
    </div>
  );
}

function PlaceCard({ place }: { place: Place }) {
  const image = place.images?.[0];
  return (
    <article className="place-card" dir="rtl">
      <header className="card-header">
        <div>
          <h4 dir="auto">{place.nameHe}</h4>
          <p className="english-name" dir="ltr">{place.name}</p>
          {place.nameJa && <p className="japanese-name" dir="auto">{place.nameJa}</p>}
        </div>
        <span className="category-chip" dir="ltr">{place.category}</span>
      </header>

      <PlaceImageBlock imageUrl={image?.url} caption={image?.caption ?? image?.alt ?? `תמונת זיהוי עבור ${place.nameHe}`} />
      <p className="place-description" dir="auto">{place.shortDescription}</p>

      <div className="quick-info-grid">
        <InfoCard title="תחנה / יציאה">
          {place.stationAccess?.length ? <StationAccessList items={place.stationAccess} /> : <span>להשלים ב-Admin</span>}
        </InfoCard>
        <InfoCard title="כרטיסים">
          {place.ticketInfo ? <TicketInfoView ticketInfo={place.ticketInfo} /> : <span>להשלים ב-Admin</span>}
        </InfoCard>
        <InfoCard title="שעות">
          {place.openingHours ? <OpeningHoursView openingHours={place.openingHours} /> : <span>להשלים ב-Admin</span>}
        </InfoCard>
      </div>

      <details className="place-details" open>
        <summary>מה עושים כאן?</summary>
        <ul>{place.whatToDo.map((item) => <li key={item} dir="auto">{item}</li>)}</ul>
      </details>

      {place.visualCues?.length ? (
        <details className="place-details" open>
          <summary>איך מזהים שהגענו למקום הנכון?</summary>
          <ul>{place.visualCues.map((cue) => <li key={cue} dir="auto">{cue}</li>)}</ul>
        </details>
      ) : null}

      <div className="place-actions">
        <a href={place.googleMapsUrl} target="_blank" rel="noreferrer">פתח ב-Google Maps</a>
        <span>{place.timeNeededMinutes} דק׳</span>
        {place.bookingRequired && <span className="booking-required">דורש הזמנה/בדיקה</span>}
      </div>
    </article>
  );
}

function PlaceImageBlock({ imageUrl, caption }: { imageUrl?: string; caption: string }) {
  if (imageUrl) {
    return (
      <figure className="place-photo">
        <img src={imageUrl} alt={caption} loading="lazy" />
        <figcaption>{caption}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="place-photo placeholder-photo">
      <div aria-hidden="true">📷</div>
      <figcaption>{caption}</figcaption>
      <small>להוסיף תמונה שלכם/צילום מסך מורשה דרך Admin.</small>
    </figure>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="info-card">
      <h5>{title}</h5>
      <div>{children}</div>
    </section>
  );
}

function StationAccessList({ items }: { items: StationAccess[] }) {
  return (
    <ul className="compact-list">
      {items.map((item) => (
        <li key={`${item.station}-${item.exit ?? ''}`}>
          <strong dir="ltr">{item.station}</strong>
          {item.exit && <> · יציאה: <span dir="ltr">{item.exit}</span></>}
          {typeof item.walkMinutes === 'number' && <> · {item.walkMinutes} דק׳ הליכה</>}
          {item.lines?.length ? <div className="muted" dir="ltr">{item.lines.join(' · ')}</div> : null}
          {item.notes && <div className="muted" dir="auto">{item.notes}</div>}
        </li>
      ))}
    </ul>
  );
}

function TicketInfoView({ ticketInfo }: { ticketInfo: TicketInfo }) {
  return (
    <div>
      <strong>{ticketRequirementLabel(ticketInfo.requirement)}</strong>
      {ticketInfo.priceHint && <p className="muted" dir="auto">{ticketInfo.priceHint}</p>}
      {ticketInfo.bookingUrl && <a href={ticketInfo.bookingUrl} target="_blank" rel="noreferrer">קישור רשמי</a>}
      {ticketInfo.notes?.length ? <ul className="compact-list">{ticketInfo.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
    </div>
  );
}

function OpeningHoursView({ openingHours }: { openingHours: OpeningHours }) {
  return (
    <div>
      <p dir="auto">{openingHours.summary}</p>
      {openingHours.verifyUrl && <a href={openingHours.verifyUrl} target="_blank" rel="noreferrer">בדיקה באתר רשמי</a>}
      {openingHours.lastVerified && <p className="muted">עודכן: <span dir="ltr">{openingHours.lastVerified}</span></p>}
      {openingHours.notes?.length ? <ul className="compact-list">{openingHours.notes.map((note) => <li key={note}>{note}</li>)}</ul> : null}
    </div>
  );
}

function RouteCard({ route, compact }: { route: RouteLeg; compact?: boolean }) {
  return (
    <article className={compact ? 'route-card compact' : 'route-card'}>
      <div className="route-header">
        <div>
          <h4>{route.title}</h4>
          <p className="muted">{route.instructionsShort}</p>
        </div>
        <span className={`route-status ${route.adminStatus}`}>{routeStatusLabel(route.adminStatus)}</span>
      </div>
      <div className="route-metrics">
        <span>{route.estimatedMinutes} דק׳</span>
        <span>באפר {route.bufferMinutes} דק׳</span>
        <span>{route.ticketNeeded ? 'כרטיס/בדיקה נדרש' : 'IC/מקומי'}</span>
      </div>
      {!compact && (
        <>
          <ol className="route-steps">
            {route.steps.map((step) => (
              <li key={step.order}>
                <strong>{transportModeLabel(step.mode)}</strong>
                {' · '}
                <span dir="auto">{step.from} → {step.to}</span>
                {step.line && <span className="line-chip" dir="ltr">{step.line}</span>}
                {step.estimatedMinutes && <span className="muted"> · {step.estimatedMinutes} דק׳</span>}
                {step.notes && <p className="muted" dir="auto">{step.notes}</p>}
              </li>
            ))}
          </ol>
          <details>
            <summary>כרטיסים ו-Fallback</summary>
            <ul>{route.ticketNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            <p>{route.offlineFallback}</p>
          </details>
        </>
      )}
      <a href={route.googleMapsDirectionsUrl} target="_blank" rel="noreferrer">פתח ניווט חי</a>
    </article>
  );
}

function BookingCenter() {
  const grouped = {
    high: tripData.bookingItems.filter((item) => item.priority === 'high'),
    medium: tripData.bookingItems.filter((item) => item.priority === 'medium'),
    low: tripData.bookingItems.filter((item) => item.priority === 'low')
  };
  return (
    <section className="panel page-panel">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Action list</p>
          <h2>רשימת הזמנות מראש ויצירת קשר</h2>
        </div>
      </div>
      <p className="summary">פה מרוכזים כרטיסים, רכבות, סיורים ומסעדות. מידע רגיש כמו QR, דרכונים ומספרי הזמנה מלאים לא אמור להישמר בקוד.</p>
      <BookingGroup title="דחוף / חשוב" items={grouped.high} />
      <BookingGroup title="בינוני" items={grouped.medium} />
      <BookingGroup title="נמוך" items={grouped.low} />
    </section>
  );
}

function BookingGroup({ title, items }: { title: string; items: BookingItem[] }) {
  if (!items.length) return null;
  return (
    <section className="booking-group">
      <h3>{title}</h3>
      <div className="booking-grid">
        {items.map((item) => <BookingCard key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function BookingCard({ item }: { item: BookingItem }) {
  return (
    <article className="booking-card">
      <div className="booking-card-top">
        <span className={`status-chip ${item.status}`}>{statusLabel(item.status)}</span>
        <span className={`priority-dot ${item.priority}`}>{priorityText(item.priority)}</span>
      </div>
      <h3>{item.title}</h3>
      <p className="booking-action">{item.suggestedAction}</p>
      <dl className="booking-dl">
        {item.date && <><dt>תאריך</dt><dd dir="ltr">{item.date}</dd></>}
        {item.preferredTime && <><dt>שעה מועדפת</dt><dd>{item.preferredTime}</dd></>}
        {item.deadline && <><dt>דדליין</dt><dd dir="ltr">{item.deadline}</dd></>}
        <dt>אחראי</dt><dd>{item.owner ?? 'לא נקבע'}</dd>
      </dl>
      {item.contacts?.length ? (
        <div className="contact-list">
          {item.contacts.map((contact) => (
            contact.url ? <a key={contact.label} href={contact.url} target="_blank" rel="noreferrer" dir={contact.type === 'email' ? 'ltr' : 'auto'}>{contact.label}</a> : <span key={contact.label}>{contact.label}: {contact.value}</span>
          ))}
        </div>
      ) : null}
      <ul>{item.notes.map((note) => <li key={note} dir="auto">{note}</li>)}</ul>
    </article>
  );
}

function TransportCenter() {
  return (
    <section className="panel page-panel">
      <p className="eyebrow">Transport</p>
      <h2>רכבות, שינקנסן ומעברים</h2>
      <p className="summary">כל מעבר כולל מה לקחת, מאיפה, האם צריך כרטיס, ומה עושים אם אין אינטרנט. זמני רכבות מדויקים עדיין דורשים בדיקה חיה סמוך לנסיעה.</p>
      <div className="transport-list">
        {tripData.routeLegs.map((route) => <RouteCard key={route.id} route={route} />)}
      </div>
    </section>
  );
}

function ItineraryOverview({ onSelectDay }: { onSelectDay: (dayId: string) => void }) {
  return (
    <section className="panel page-panel">
      <p className="eyebrow">Overview</p>
      <h2>כל הימים במבט אחד</h2>
      <div className="overview-grid">
        {tripData.days.map((day) => (
          <button key={day.id} className="overview-card" onClick={() => onSelectDay(day.id)}>
            <span>{formatHebrewDate(day.date)}</span>
            <strong>{day.title}</strong>
            <small>{day.summary}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function AdminPanel({ user, membership }: { user: User | null; membership: Membership }) {
  if (!isSupabaseConfigured || !supabase) {
    return (
      <section className="panel page-panel admin-panel">
        <p className="eyebrow">Admin setup</p>
        <h2>Supabase עדיין לא מחובר</h2>
        <p className="summary">כדי לבדוק התחברות אמיתית והרשאות Admin צריך ליצור קובץ <span dir="ltr">.env.local</span> עם ה-URL וה-anon key של Supabase.</p>
        <pre className="code-preview" dir="ltr">{`VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=PASTE_LOCAL_ANON_KEY_HERE`}</pre>
      </section>
    );
  }

  if (membership.role !== 'admin') {
    return (
      <section className="panel page-panel admin-panel">
        <p className="eyebrow">Admin</p>
        <h2>אין הרשאת Admin</h2>
        <p className="summary">את/ה מחובר/ת כ-{membership.display_name} עם הרשאת {membership.role}. אפשר לצפות באתר, אבל אי אפשר ליצור הצעות שינוי.</p>
      </section>
    );
  }

  return <AdminProposalConsole user={user} membership={membership} />;
}

function AdminProposalConsole({ user, membership }: { user: User | null; membership: Membership }) {
  const [title, setTitle] = useState('בדיקה: הצעת שינוי מהצ׳אט');
  const [summary, setSummary] = useState('נוצר ידנית מתוך מסך Admin כדי לבדוק שה-POST ל-Supabase עובד.');
  const [score, setScore] = useState(88);
  const [recommendation, setRecommendation] = useState('accept_with_changes');
  const [operationsJson, setOperationsJson] = useState(JSON.stringify([
    {
      op: 'update_booking_item',
      id: 'kosher-wagyu',
      patch: { status: 'to-check' }
    }
  ], null, 2));
  const [proposals, setProposals] = useState<ChangeProposalRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function refresh() {
    try {
      const rows = await listChangeProposals(tripData.trip.id);
      setProposals(rows);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load proposals');
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submitProposal(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const operations = JSON.parse(operationsJson);
      if (!Array.isArray(operations)) {
        throw new Error('operations חייב להיות מערך JSON');
      }

      await createChangeProposal({
        tripId: tripData.trip.id,
        title,
        summary,
        score,
        recommendation,
        impact: {
          affectedDates: [],
          timeImpact: 'low',
          budgetImpact: 'low',
          fatigueImpact: 'low',
          logisticsRisk: 'low'
        },
        reasoning: {
          pros: ['בדיקת כתיבה ל-Supabase מה-Admin'],
          cons: [],
          tradeoffs: [],
          assumptions: ['זה payload בדיקה ולא שינוי אמיתי במסלול']
        },
        operations
      });

      setStatus('נשמר בהצלחה ל-Supabase. עכשיו Viewer אמור לראות רק את האתר, ו-Admin רואה את הרשימה כאן.');
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create proposal');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel page-panel admin-panel">
      <p className="eyebrow">Admin workflow</p>
      <h2>יצירת Change Proposal</h2>
      <p className="summary">מחובר כ-{membership.display_name} ({membership.role}) · {user?.email}</p>

      <form className="admin-form" onSubmit={submitProposal}>
        <label>
          כותרת
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          תקציר
          <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={3} />
        </label>
        <div className="form-row">
          <label>
            ציון
            <input type="number" min={1} max={100} value={score} onChange={(event) => setScore(Number(event.target.value))} />
          </label>
          <label>
            המלצה
            <select value={recommendation} onChange={(event) => setRecommendation(event.target.value)}>
              <option value="accept">accept</option>
              <option value="accept_with_changes">accept_with_changes</option>
              <option value="reject">reject</option>
              <option value="needs_more_info">needs_more_info</option>
            </select>
          </label>
        </div>
        <label>
          Operations JSON
          <textarea dir="ltr" value={operationsJson} onChange={(event) => setOperationsJson(event.target.value)} rows={8} />
        </label>
        <button type="submit" disabled={isSaving}>{isSaving ? 'שומר...' : 'שלח POST ל-Supabase'}</button>
      </form>

      {status && <p className="admin-status" dir="auto">{status}</p>}

      <section className="proposal-list">
        <div className="section-title-row">
          <h3>הצעות קיימות</h3>
          <button onClick={refresh}>רענן</button>
        </div>
        {proposals.length === 0 ? <p className="muted">אין עדיין הצעות.</p> : proposals.map((proposal) => (
          <article key={proposal.id} className="proposal-card">
            <div>
              <strong>{proposal.title}</strong>
              <p>{proposal.summary}</p>
            </div>
            <span>{proposal.score ?? '—'}/100</span>
            <small dir="ltr">{proposal.status}</small>
          </article>
        ))}
      </section>
    </section>
  );
}

function LoadingScreen({ text }: { text: string }) {
  return <main className="app-shell auth-shell" dir="rtl"><section className="panel page-panel"><h1>{text}</h1></section></main>;
}

function LoginScreen({ message }: { message: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localMessage, setLocalMessage] = useState<string | null>(message);
  const [loading, setLoading] = useState(false);

  async function signInWithPassword(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setLocalMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setLocalMessage(error.message);
  }

  async function sendMagicLink() {
    if (!supabase) return;
    if (!email) {
      setLocalMessage('צריך להזין מייל קודם.');
      return;
    }
    setLoading(true);
    setLocalMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    setLoading(false);
    setLocalMessage(error ? error.message : 'נשלח קישור כניסה למייל. בלוקאלי בודקים אותו דרך Mailpit/Inbucket של Supabase.');
  }

  return (
    <main className="app-shell auth-shell" dir="rtl">
      <section className="panel page-panel login-card">
        <p className="eyebrow" dir="ltr">Japan Trip Companion</p>
        <h1>כניסה לאתר הטיול</h1>
        <p className="summary">בשלב הבדיקה ניצור משתמשים ב-Supabase: Admin, Editor ו-Viewers. כל אחד יראה את האתר לפי ההרשאה שלו.</p>
        <form className="admin-form" onSubmit={signInWithPassword}>
          <label>
            מייל
            <input dir="ltr" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          </label>
          <label>
            סיסמה
            <input dir="ltr" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" />
          </label>
          <button type="submit" disabled={loading}>{loading ? 'מתחבר...' : 'כניסה עם סיסמה'}</button>
          <button type="button" className="secondary-button" onClick={sendMagicLink} disabled={loading}>שלח Magic Link</button>
        </form>
        {localMessage && <p className="admin-status" dir="auto">{localMessage}</p>}
      </section>
    </main>
  );
}

function NotMemberScreen({ user, message }: { user: User; message: string | null }) {
  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <main className="app-shell auth-shell" dir="rtl">
      <section className="panel page-panel login-card">
        <h1>המשתמש מחובר אבל לא משויך לטיול</h1>
        <p className="summary">המייל <span dir="ltr">{user.email}</span> קיים ב-Supabase, אבל אין לו רשומה בטבלת <span dir="ltr">trip_members</span> עבור הטיול הזה.</p>
        {message && <p className="admin-status" dir="auto">{message}</p>}
        <button onClick={signOut}>התנתק</button>
      </section>
    </main>
  );
}

function AuthBadge({ user, membership }: { user: User | null; membership: Membership }) {
  async function signOut() {
    await supabase?.auth.signOut();
  }

  return (
    <div className="auth-badge">
      <div>
        <span>משתמש</span>
        <strong>{membership.display_name}</strong>
        <small dir="ltr">{user?.email ?? 'demo-mode'} · {membership.role}</small>
      </div>
      {user && <button onClick={signOut}>התנתק</button>}
    </div>
  );
}

function SupabaseSetupBanner() {
  return (
    <section className="setup-banner">
      מצב Demo: אין עדיין קובץ <span dir="ltr">.env.local</span>. האתר עובד סטטית, אבל Login/Admin POST יפעלו רק אחרי חיבור Supabase.
    </section>
  );
}

function formatHebrewDate(date: string) {
  return new Intl.DateTimeFormat('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${date}T12:00:00+09:00`));
}

function priorityLabel(priority: 'must' | 'recommended' | 'optional') {
  return priority === 'must' ? 'חובה' : priority === 'recommended' ? 'מומלץ' : 'אופציונלי';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    'not-needed': 'לא צריך',
    'to-check': 'לבדוק',
    'to-book': 'להזמין',
    booked: 'הוזמן',
    cancelled: 'בוטל'
  };
  return labels[status] ?? status;
}

function priorityText(priority: BookingItem['priority']) {
  return priority === 'high' ? 'גבוה' : priority === 'medium' ? 'בינוני' : 'נמוך';
}

function moodLabel(mood: DayPlan['mood']) {
  const labels: Record<DayPlan['mood'], string> = {
    arrival: 'נחיתה',
    classic: 'קלאסי',
    culture: 'תרבות',
    nature: 'טבע',
    transit: 'מעבר',
    'last-day': 'יום אחרון',
    mixed: 'מעורב'
  };
  return labels[mood];
}

function ticketRequirementLabel(value: TicketInfo['requirement']) {
  const labels: Record<TicketInfo['requirement'], string> = {
    none: 'אין צורך בכרטיס',
    onsite: 'כרטיס במקום',
    'online-recommended': 'מומלץ להזמין אונליין',
    'reservation-required': 'דורש הזמנה',
    'included-in-tour': 'כלול בסיור',
    'to-check': 'צריך לבדוק'
  };
  return labels[value];
}

function routeStatusLabel(value: RouteLeg['adminStatus']) {
  const labels: Record<RouteLeg['adminStatus'], string> = {
    ready: 'מוכן',
    'needs-live-check': 'בדיקה חיה',
    'needs-booking': 'דורש הזמנה',
    draft: 'טיוטה'
  };
  return labels[value];
}

function transportModeLabel(mode: RouteLeg['mode']) {
  const labels: Record<RouteLeg['mode'], string> = {
    walk: 'הליכה',
    train: 'רכבת',
    bus: 'אוטובוס',
    taxi: 'מונית',
    shinkansen: 'Shinkansen',
    'airport-train': 'רכבת שדה',
    other: 'אחר'
  };
  return labels[mode];
}

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Development mode may block service workers depending on the environment.
    });
  });
}
