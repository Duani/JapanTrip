# Japan Trip Companion v5 — מדריך עדכון בעברית

מטרת הגרסה: לשמור הצעה, לבדוק תצוגת לפני/אחרי, לאשר פרסום, ולאפשר לכל המשפחה לקרוא רק את הגרסה המפורסמת מתוך Supabase.

## לפני שמתחילים

- **אל תריץ `supabase db reset`**: זה מוחק משתמשים ונתונים במסד המקומי.
- השאר את `.env.local`, `.git`, `node_modules` וסיסמאות מקומיות בתיקיית הפרויקט שלך. אין צורך להעביר אותם מה־ZIP.
- ודא ש־Docker/Supabase המקומי עובד (`npx supabase status` מתוך הפרויקט).
- ה־ZIP כולל שני קבצי migration חדשים: `0002_publish_trip_snapshot.sql` ו־`0003_seed_initial_trip.sql`.
- הנתונים של המסלול שמורים ב־DB ולא מיובאים יותר לתוך קובצי ה־JavaScript של האתר. זה חשוב כשהאתר נגיש באינטרנט.

## שלב א: מיזוג הקוד החדש לפרויקט הקיים (Terminal ב־Mac)

1. היכנס לתיקייה של הפרויקט הנוכחי (עם `.git`, `src`, `supabase`, `package.json`) ובדוק `git status`. שמור/בצע commit לשינויים מקומיים לפני העדכון.
2. חלץ את ZIP החדש, למשל לתיקייה `~/Downloads/japan-v5-unpacked`.
3. העתק את הקוד באמצעות `rsync` כדי לשמור את קובצי הסביבה וה־Git הקיימים (התאם את נתיב הפרויקט האישי שלך):

```bash
cd ~/Desktop/japan-trip-companion-starter
rsync -av --exclude='.git/' --exclude='.env.local' --exclude='node_modules/' --exclude='dist/' \
  ~/Downloads/japan-v5-unpacked/japan-trip-companion-starter/ ./
npm install
npm run build
```

## שלב ב: שדרוג Supabase מקומי, בלי מחיקת משתמשים

ב־Terminal, בתוך תיקיית הפרויקט:

```bash
npx supabase status
npx supabase migration up --local
```

לא להשתמש ב־`npx supabase db reset`.

ב־Supabase Studio המקומי `http://127.0.0.1:54323` → SQL Editor:

```sql
select version_number, status, changelog
from public.trip_versions
where trip_id = 'japan-2026-elad-gal-riva-jacob'
order by version_number;
```

לאחר ההתקנה, אמורה להיות **v1 published** (אלא אם היו כבר גרסאות ממנגנון קודם).

## שלב ג: לפרסם את שינוי 26.10

```bash
npm run dev
```

1. התחבר באתר כ־Elad (admin), עבור ל־**Admin**.
2. לחץ **טען הצעת Skytree ל־26.10**.
3. בדוק שהכותרת וה־JSON מופיעים בשדות, ואז לחץ **שלח POST ל־Supabase**. כאן זו רק הצעה, לא פרסום.
4. ברשימת ההצעות, חפש את הצעת Skytree החדשה, לחץ **הצג תצוגה מקדימה**.
5. ודא שהיום השתנה כך ש־`Tokyo Skytree` מופיע ב־**17:00** ואילו Shibuya Sky הוסר. יופיעו גם Booking ונתיב תחבורה מעודכנים.
6. לחץ **אני מאשר — פרסם למשפחה**, ואשר בחלונית.
7. אמורה להופיע **v2** באתר. פתח את האתר בחלון Incognito (Gal/viewer), בצע refresh ובדוק שגם שם מופיע Skytree.

בדיקת SQL:

```sql
select version_number, status, changelog, published_at
from public.trip_versions
where trip_id = 'japan-2026-elad-gal-riva-jacob'
order by version_number;
```

לאחר פרסום ראשון: v1 archived, v2 published.

## שלב ד: GitHub (אחרי שבדקת את הלוקאלי)

ב־Terminal, מתוך תיקיית הפרויקט:

```bash
git status
git add .
git diff --cached --stat
git commit -m "Add admin trip publishing and Skytree itinerary"
git push origin main
```

**בדיקת סודות:** ודא ש־`.env.local` וקבצים תחת `supabase/.temp/` אינם ב־`git status` או ב־GitHub.

## שלב ה: Supabase בענן (שירות קיים אצלך)

אם הפרויקט בענן כבר מקושר ל־CLI, מתוך ה־Terminal:

```bash
npx supabase db push
```

לפני שמריצים ודא שה־project ref המקושר הוא הפרויקט הנכון (`npx supabase projects list`; לפי הצורך `npx supabase link --project-ref ...`). השינויים בענן לא מעתיקים את המשתמשים המקומיים: יש ליצור משתמשים ולשייך אותם ל־`trip_members` בסביבת הענן בנפרד, באמצעות ה־SQL שעשינו קודם.

## שלב ו: Cloudflare Pages

ב־Cloudflare Dashboard → Workers & Pages → Create application → Pages → Import existing Git repository → בחר `Duani/JapanTrip`:

- Production branch: `main`
- Framework: React (Vite)
- Build command: `npm run build`
- Build output directory: `dist`

Environment variables לסביבת Production:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_KEY
```

הכוונה למפתח ה־Publishable, **לעולם לא** למפתח `sb_secret_...`.

אחרי פרסום, ב־Supabase הענני → Authentication → URL Configuration: הגדר Site URL לכתובת המדויקת של האתר (`https://...pages.dev`) וצרף את הכתובת ל־Redirect URLs. מומלץ גם להותיר `http://localhost:5173/**` עבור בדיקות לוקאליות.

## חשוב לדעת

- בסביבה החדשה, המסלול נטען מתוך Supabase אחרי login. האתר עצמו לא מכיל snapshot פרטי ב־JS.
- אין עדיין תמיכה מובטחת בצפייה אופליין בלי אינטרנט; זו הרחבה עתידית.
- מהצ'אט הזה אני מכין את הצעת השינוי; פרסום אוטומטי ישירות מהצ'אט לא חובר. כעת מיישמים דרך מסך Admin, עם אישור אנושי.
- יש להמשיך ולוודא זמני רכבות, שעות פתיחה וכניסות באתרי המפעילים; הפרויקט לא בודק זמינות בזמן אמת.
- שינקנסנים שהוזמנו צריכים עדכון נפרד ב־Booking Center; גרסה זו ממוקדת בהזמנת Skytree.
