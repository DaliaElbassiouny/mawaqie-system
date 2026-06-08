# دليل النشر على Render — MAWAQEI ELNUJUM
## شركة مواقع النجوم للمقاولات

> ملاحظة: ده **بروجكت جديد منفصل** عن مشروع CDC القديم. مستودع CDC (`cdc-system`) بيفضل زي ما هو ومش بنلمسه.

---

## نظرة عامة
المشروع بيتكوّن من 3 خدمات بينشرها Render أوتوماتيك من ملف [`render.yaml`](render.yaml):

| الخدمة | النوع | الوصف |
|---|---|---|
| `mawaqie-db` | PostgreSQL | قاعدة البيانات |
| `mawaqie-api` | Node Web Service | الباك إند (NestJS) |
| `mawaqie-web` | Node Web Service | الفرونت إند (Next.js) |

---

## الخطوة 1 — رفع الكود على repo جديد على GitHub

1. ادخلي على https://github.com/new
2. اسم المستودع: **`mawaqie-system`** — خليه **Private** أو Public زي ما تحبي.
3. **مهم:** سيبيه فاضي تماماً (من غير README / .gitignore / License).
4. اضغطي **Create repository**.

بعدها هربط الكود بالمستودع الجديد وأرفعه (من غير ما ألمس مستودع CDC القديم).

---

## الخطوة 2 — النشر على Render (Blueprint)

1. اعملي حساب على https://render.com (مجاني — تقدري تسجّلي بحساب GitHub).
2. من الـ Dashboard: **New → Blueprint**.
3. اختاري مستودع **`mawaqie-system`**.
4. Render هيقرأ `render.yaml` ويعرضلك الـ 3 خدمات → اضغطي **Apply**.
5. استنّي البناء (أول مرة بياخد 5–10 دقائق).

> الروابط هتبقى:
> - الموقع: `https://mawaqie-web.onrender.com`
> - الـ API: `https://mawaqie-api.onrender.com`
>
> لو الأسماء دي محجوزة، Render هيغيّرها — ساعتها لازم تعدّلي `FRONTEND_URL` و`NEXT_PUBLIC_API_URL` في إعدادات الخدمتين ليطابقوا الروابط الفعلية.

---

## الخطوة 3 — زرع بيانات الأدمن (مرة واحدة)

قاعدة البيانات بتتعمل فاضية، فمحتاجين نزرع المستخدم والبيانات التجريبية مرة واحدة. أسهل طريقة من جهازك:

1. في Render: افتحي خدمة `mawaqie-db` → انسخي **External Database URL**.
2. على جهازك، في مجلد المشروع، شغّلي (غيّري الرابط للي نسختيه):

   ```powershell
   $env:DATABASE_URL="<External Database URL من Render>"
   pnpm --filter @mawaqie/api db:seed
   ```

3. خلاص — تقدري تدخلي على الموقع بـ:
   - **admin@mawaqie.local**
   - **Mawaqie@2026!**

> غيّري كلمة مرور الأدمن من داخل النظام بعد أول دخول.

---

## ملاحظات مهمة عن الخطة المجانية (Free) في Render
- الخدمات المجانية **بتنام** بعد ~15 دقيقة خمول، وأول طلب بعدها بياخد 30–50 ثانية تقوم تاني (ده طبيعي في الخطة المجانية).
- قاعدة البيانات المجانية ليها حد للمساحة وبتتمسح بعد فترة على الخطة المجانية — للإنتاج الجدّي رقّي خطة الـ database.
- أي push جديد على فرع `main` في GitHub هيعمل **deploy أوتوماتيك**.

---

## متغيّرات البيئة (بيظبّطها render.yaml أوتوماتيك)
| الخدمة | المتغيّر | المصدر |
|---|---|---|
| api | `DATABASE_URL` | من قاعدة البيانات |
| api | `JWT_SECRET` / `JWT_REFRESH_SECRET` | بيتولّدوا أوتوماتيك |
| api | `FRONTEND_URL` | رابط الموقع (للـ CORS) |
| web | `NEXT_PUBLIC_API_URL` | رابط الـ API + `/api/v1` |
