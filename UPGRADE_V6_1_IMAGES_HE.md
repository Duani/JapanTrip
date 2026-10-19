# עדכון v6.1 — תמונות נוספות למסלול

## מה היה חסר?
בנוסף למיפוי החסר, תמונות שהורדתם ל-`public/images` הן קבצים מקומיים: כדי שייראו באתר Cloudflare חייבים להוסיף אותן ל-Git ולקבל Deploy חדש.
ב-v6 רק שישה מזהי מקומות הופיעו במפת התמונות. ב-v6.1 נוספה התאמה עבור 23 מקומות, כולל Skytree והנקודות שנוצרו ב-Supabase. מלונות מקבלים תמונה רק אם נמצא צילום מדויק עם רישיון מתאים או אם תוסיפו צילום משלכם.

## התקנה
חלצו את ה-ZIP בתיקייה נפרדת, ומזגו אותו לתיקיית הפרויקט הקיימת (לא לתיקיית משנה). שמרו את `.git`, `.env.local` ואת `public/images/` הקיים!

```bash
# מתוך תיקיית הפרויקט הפעילה, אחרי חילוץ ה-ZIP ל-~/Downloads/japan-v6-1-unpacked:
rsync -av --exclude='.git/' --exclude='.env.local' --exclude='node_modules/' --exclude='dist/' --exclude='public/images/' --exclude='PHOTO_CREDITS.md' \
  ~/Downloads/japan-v6-1-unpacked/japan-trip-companion-starter/ ./

npm run images:preview      # בדיקת מועמדים בלבד; לא מוריד
npm run images:fetch        # מוריד JPEG עם רישיון מתאים ומשמר תמונות שהורדתם בעבר
npm run images:report       # מספר תמונות ותיאור מה חסר
npm run build
npm run dev
```

## חשוב לגבי רישיונות ואמינות
- הסקריפט מחפש רק ב-Wikimedia Commons, מקבל JPEG עם רישיון מזוהה CC BY / CC BY-SA / CC0 או Public Domain, ושומר קרדיט ורישיונות ב-`PHOTO_CREDITS.md` וב-`public/images/photo-credits.html`.
- מעבר לתנאי הרישיון, חייבים לבדוק ויזואלית שכל תמונה אכן תואמת למקום! צילום רחוב באזור אינו תמיד צילום של הכניסה הנכונה.
- חנויות קטנות כמו Age.3 וחלק מהמלונות כנראה ידרשו תמונה שלכם או תמונה עם אישור להשתמש; לא מציגים תמונה ממלון אחר.
- אם לא נמצאה תמונה, היא נשארת placeholder; בדקו את `PHOTO_REPORT.md` כדי למצוא את שם הקובץ הנדרש.
- ניתן להוסיף צילום שלכם באופן ידני בנתיב המצוין ב-`PHOTO_REPORT.md`, בפורמט JPEG.
- שירות ה-PWA מכניס תמונות שביקרו בהן למטמון; זה לא מבטיח שלכל התמונות תהיה גישה ללא אינטרנט עד שתצפו בהן.

## פרסום לענן
מכיוון שמדובר בקובצי קוד ותמונות, אין צורך לשנות את מסד הנתונים או את v2 של המסלול.

בדקו את התיקיות והוסיפו ל-Git גם את `public/images/` ואת `PHOTO_CREDITS.md` / `PHOTO_REPORT.md`:

```bash
git status
git add -A
git diff --cached --stat
git commit -m "Expand trip photo coverage and credits"
git push origin main
```

Cloudflare יבנה את האתר החדש מתוך GitHub.
