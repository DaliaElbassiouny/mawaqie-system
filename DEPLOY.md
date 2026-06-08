# دليل النشر — MAWAQEI ELNUJUM
## شركة مواقع النجوم للمقاولات

التقسيمة:
- 🟢 **الباك إند (NestJS) + قاعدة البيانات** → **Render**
- ▲ **الفرونت إند (Next.js)** → **Vercel**

> ده **بروجكت جديد منفصل** عن CDC. مستودع `cdc-system` القديم بيفضل زي ما هو.

---

## الترتيب المهم
انشري **الباك إند الأول على Render**، عشان تجيبي رابط الـ API وتحطّيه في Vercel.

---

## الجزء الأول — الباك إند + الداتابيز على Render

1. اعملي حساب على https://render.com (سجّلي بحساب GitHub).
2. **New → Blueprint** → اختاري مستودع **`mawaqie-system`**.
3. Render هيقرأ [`render.yaml`](render.yaml) ويعرض خدمتين: `mawaqie-db` + `mawaqie-api` → **Apply**.
4. استنّي البناء (5–10 دقائق أول مرة).
5. بعد ما يخلص، انسخي رابط الـ API — هيبقى شكله:
   ```
   https://mawaqie-api.onrender.com
   ```
   (لو الاسم محجوز هيبقى مختلف — خدي الرابط الفعلي من Render.)

### ازرعي بيانات الأدمن (مرة واحدة)
1. في Render افتحي **`mawaqie-db`** → انسخي **External Database URL**.
2. على جهازك في فولدر المشروع:
   ```powershell
   $env:DATABASE_URL="<External Database URL>"
   pnpm --filter @mawaqie/api db:seed
   ```

---

## الجزء الثاني — الفرونت إند على Vercel

1. اعملي حساب على https://vercel.com (سجّلي بحساب GitHub).
2. **Add New → Project** → اختاري مستودع **`mawaqie-system`**.
3. في إعدادات المشروع (مهم جداً لأنه monorepo):
   - **Root Directory:** اضغطي **Edit** واختاري **`apps/web`**
   - **Framework Preset:** Next.js (هيتظبط أوتوماتيك)
   - **Build / Install Command:** سيبيهم افتراضي (Vercel بيتعامل مع pnpm workspace لوحده)
4. تحت **Environment Variables** ضيفي:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://mawaqie-api.onrender.com/api/v1` |
   | `NEXT_PUBLIC_DEFAULT_LOCALE` | `ar` |
   > غيّري رابط الـ API للرابط الفعلي من Render لو مختلف.
5. اضغطي **Deploy**.
6. بعد ما يخلص، Vercel هيديكي رابط الموقع، شكله:
   ```
   https://mawaqie-system.vercel.app
   ```

---

## الجزء الثالث — اربطي الاتنين (CORS)

1. ارجعي لـ Render → خدمة **`mawaqie-api`** → **Environment**.
2. عدّلي **`FRONTEND_URL`** ليطابق رابط Vercel الفعلي (مثلاً `https://mawaqie-system.vercel.app`).
3. اعملي **Manual Deploy → Deploy latest commit** للـ API عشان ياخد التغيير.

---

## تسجيل الدخول
- الرابط: رابط Vercel بتاعك
- **admin@mawaqie.local** / **Mawaqie@2026!**

> غيّري كلمة المرور من داخل النظام بعد أول دخول.

---

## ملاحظات
- **خطة Render المجانية بتنام** بعد ~15 دقيقة خمول؛ أول طلب بعدها بياخد ~30 ثانية يصحى (طبيعي).
- أي `git push` على فرع `main` بيعمل **deploy أوتوماتيك** على Render و Vercel.
- لو غيّرتي رابط الـ API لاحقاً، لازم تعدّلي `NEXT_PUBLIC_API_URL` في Vercel **وتعملي Redeploy** (لأنه بيتدمج وقت البناء).

---

## ملخص متغيّرات البيئة
| المكان | المتغيّر | القيمة |
|---|---|---|
| Render (api) | `DATABASE_URL` | من قاعدة البيانات (أوتوماتيك) |
| Render (api) | `JWT_SECRET` / `JWT_REFRESH_SECRET` | أوتوماتيك |
| Render (api) | `FRONTEND_URL` | رابط Vercel |
| Vercel (web) | `NEXT_PUBLIC_API_URL` | رابط Render API + `/api/v1` |
