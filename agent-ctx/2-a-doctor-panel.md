# Task 2-a — Doctor Panel (پنل پزشک) — Work Record

Agent: senior-frontend (doctor panel)
Stage: 2 — Doctor panel of the «دکترها» Persian RTL healthcare demo
Date: 2026-10-30
Status: ✅ COMPLETE — all 12 pages + patient detail built, lint clean, agent-browser verified

## Scope respected

Created/modified ONLY:
- `src/app/doctor/**` (13 page files; `layout.tsx` untouched)
- `src/features/doctor/**` (15 component files)

Everything else read-only. Foundation gaps found are listed at the bottom (NOT fixed).

## Files created/modified

| File | Purpose |
|---|---|
| `src/app/doctor/page.tsx` | Dashboard — self-contained (681 lines): 6 StatCards, AreaChart «ویزیت‌های ۳۰ روز گذشته», custom heatmap «پرتقاضاترین ساعت‌ها» (div grid, bg-primary/8..90), BarChart «درآمد ۶ ماه اخیر» (jalaliMonthKey + faMonthLabel), donut «نوع ویزیت‌ها» (VISIT_TYPE_LABELS, Persian legend), LineChart «روند امتیاز», «برنامه امروز» with تأیید/لغو(AlertDialog)/انجام‌شد/پرونده, «نوبت‌های پیش رو» (faFromNow), «آخرین نظرات» (RatingStars) |
| `src/features/doctor/shared.tsx` | `useDoctorPanel()` (doctor-scoped data hook), `VISIT_TYPE_ICONS`, `appointmentPatientName`, `netFee`, `byTime/byDateTimeAsc/byDateTimeDesc` |
| `src/features/doctor/appointment-sheet.tsx` | Shared reactive side-Sheet: patient info, badges, fee/net, reason, note→`updateAppointment`, تأیید/لغو(AlertDialog+refund)/تغییر زمان(JalaliDatePicker+slot chips→`rescheduleAppointment`)/ثبت انجام‌شد |
| `src/features/doctor/calendar.tsx` | Tabs ماه/هفته/روز; custom Jalali month grid (6×7 from شنبه, toFa(jalaliParts().jd), up-to-3 chips + «+N بیشتر», off-day striped, today ring-primary), week time grid 06–22 positioned blocks, day agenda + free-slot chips, status/type filters, legend |
| `src/features/doctor/availability.tsx` | Draft-based weekly editor (Switch + ≤4 ranges/day, 06:00–23:00 15-min Selects, visitType, DURATIONS, buffer 0–45, maxPerSlot 1–10), `validateWeeklySchedule` inline errors + disabled save, offDays card (zod, end>=start, AlertDialog deletes), overrides card (1–2 ranges + note), live slot preview via `generateSlotsForDate` on draft doctor, `findConflictingAppointments` destructive Alert, save→`updateDoctorSchedule` + off-day/override sync → toast «تقویم شما به‌روزرسانی شد و در رزرو بیماران اعمال می‌شود» |
| `src/features/doctor/appointments.tsx` | TanStack DataTable of all appointments: کد(toFa)/بیمار/faDateShort/faTime/نوع/StatusBadge/پرداخت/مبلغ + status/type/date-range toolbar + reset, CSV «نوبت-ها», mobileCard, row→shared Sheet |
| `src/features/doctor/visits.tsx` | Stats (کل/درآمد کل/میانگین مدت faDuration), BarChart with هفته/ماه/سال tabs (7d/30d/12 Jalali months), completed DataTable, detail Drawer (reason/notes/prescription pre-wrap/fee-commission-net/payment) |
| `src/features/doctor/consultations.tsx` | Two-pane inbox (mobile: Sheet), Tabs همه/درانتظار/پاسخ‌داده/بسته, overdue rose ring «مهلت گذشته», deadline chip («مهلت پاسخ: X ساعت/روز دیگر»), bubbles (patient start / doctor end bg-primary), reply+mock attach {name:'گزارش-آزمایش.jpg',sizeKB:512,type:'image'} → `addConsultationMessage`, «ارسال نسخه» zod≥10 → `setConsultationPrescription`, close→AlertDialog→`setConsultationStatus('closed')` |
| `src/features/doctor/patients.tsx` | Patients-ever-booked DataTable (name/avatar/faPhone/city/visits/last visit faFromNow/insurance) → route to detail |
| `src/features/doctor/patient-detail.tsx` | /doctor/patients/[id]: identity card (UserAvatar, insurance, bloodType, allergies/chronic Badges), stats (ویزیت‌ها/آخرین مراجعه/مجموع پرداختی), visits table, «پرونده و فایل‌ها» mock list + «بارگذاری فایل» chip, «یادداشت ویزیت»→`updateAppointment` (latest completed, dirty-state) |
| `src/features/doctor/finance.tsx` | Balance = Σ paid-completed net + paid-consults net − reserved settlements; pending/approved; 6-month net+gross BarChart; commission card (faPercent + Σcommission); transactions DataTable + CSV; settlement RHF+zod form (min 500٬۰۰۰, max balance, bank Select, IBAN ^IR\d{24}$ after toEnDigits) → `requestSettlement` |
| `src/features/doctor/reviews.tsx` | Summary (RatingStars + avg + count), distribution bars ۵→۱ with faNum+faPercent, review cards, inline reply → `replyToReview` |
| `src/features/doctor/services.tsx` | 4 fee cards (visitFee/phoneFee/textFee/videoFee) edit flow zod ≥۵۰٬۰۰۰ «تعرفه واردشده بسیار کم است» → `updateDoctor` + toast; read-only CLINIC_SERVICES of 'derma' with tomanCompact ranges |
| `src/features/doctor/settings.tsx` | Tabs شخصی (name/city CITIES/address zod → updateDoctor), حرفه‌ای (bio ≤۶۰۰ + Persian counter, education/certificates add-remove, mock upload «مدرک-نمونه.pdf», license display), تنظیمات (notification Switches, password zod: min8 «رمز عبور باید حداقل ۸ کاراکتر باشد» + match «تکرار رمز عبور مطابقت ندارد» → toast «رمز عبور تغییر کرد (شبیه‌سازی)») |
| `src/features/doctor/support.tsx` | Doctor's tickets (creatorRole 'doctor'), «ثبت تیکت جدید» zod Dialog → `createTicket` → thread Sheet with `TicketThread perspective="creator" senderRole="doctor"`, closed show RatingStars |
| 13 × `src/app/doctor/*/page.tsx` | Thin `"use client"` wrappers importing the feature components (routes match `PANEL_NAVS.doctor` exactly) |

## Fixes made during verification (my scope only)

1. **`\u200c` JSX-escape bug (availability.tsx)**: JSX text/attributes do NOT process `\u200c` escapes — they
   rendered the literal 7-char string «\u200c» in the UI (verified with esbuild: emitted as `\\u200c`).
   Replaced all 12 escapes with the real ZWNJ character (U+200C).
2. **Toast inside setState updater (availability.tsx addRange)**: moved the max-4-ranges check out of the
   updater (impure updater pattern; would double-fire under StrictMode).
3. **Latin digits in transaction descriptions (finance.tsx)**: seed descriptions embed codes («پرداخت نوبت
   NO-10001») — wrapped table cell/mobile card/CSV with `toFa()` → «NO-۱۰۰۰۱».

## Verification evidence

- `bunx eslint src/app/doctor src/features/doctor` → **0 errors, 0 warnings** (scoped lint passes).
  (`bun run lint` repo-wide still fails on pre-existing issues OUTSIDE my scope — see gaps.)
- dev.log: all 13 doctor routes compile 200, no compile errors (`GET /doctor/* 200` lines).
- **agent-browser** (named session `doctor-panel-2a`): quick-login «دکتر سارا محمدی» on /login → visited
  ALL 12 nav routes + `/doctor/patients/pat-0001`; every H1 renders with seeded data. Interactions tested:
  - Dashboard: quick action «تأیید» on a pending appointment → store updated (stat «۴ نوبت تأییدشده») + toast «نوبت تأیید شد — نوبت NO-۱۰۱۴۲».
  - Calendar: month chips (faTime + patient), week blocks, day agenda + «خالی» free-slot chips; sheet opened
    from chip → reschedule (JalaliDatePicker + slot chips «ظرفیت آزاد») → status auto-back to «در انتظار تأیید»
    + toast; note save → toast; لغو → AlertDialog → «نوبت لغو شد» + refund hint; sheet reactively reflects store.
  - Availability: added an overlapping range → error «بازه‌ها نباید همپوشانی داشته باشند؛ لطفاً ساعات را
    اصلاح کنید» + «ذخیره تقویم» disabled → fixed range → error gone, save enabled → toast
    «تقویم شما به‌روزرسانی شد و در رزرو بیماران اعمال می‌شود»; off-day add (empty submit → Persian zod errors
    «تاریخ شروع را انتخاب کنید»/«دلیل تعطیلی را وارد کنید»; valid add → draft badge → save); override add
    (date + note + default ranges → draft → save); live preview + conflict machinery wired.
  - Consultations: reply sent → `addConsultationMessage` → status flipped to «پاسخ داده شد», bubble in
    thread, toast; overdue rows show «مهلت گذشته».
  - Reviews: inline reply → «پاسخ شما» card appears.
  - Services: fee ۱۰۰۰۰ → «تعرفه واردشده بسیار کم است»; ۵۲۰٬۰۰۰ → saved + toast «تعرفه جدید: ۵۲۰٬۰۰۰ تومان…».
  - Finance: settlement submit empty/invalid → «بانک موردنظر را انتخاب کنید»/«شماره شبا معتبر نیست»;
    valid (500٬۰۰۰ / بانک ملت / IR+24 digits) → ST-۹۳۵۰۵ created + «در انتظار بررسی مدیر» confirmation.
  - Settings: password empty/short/mismatch → all three Persian errors; valid → «رمز عبور تغییر کرد (شبیه‌سازی)».
  - Support: create ticket (موضوع/دسته/اولویت/متن) → TicketThread sheet opens with new ticket; ticket listed.
  - `agent-browser errors` → **empty**; `agent-browser console` → no runtime errors from my code.
- Grep: no `text-left|text-right|ml-|mr-|pl-|pr-|left-*|right-*` RTL-illegal classes in my files; all numbers
  via fa-helpers (IBAN input `dir="ltr"` intentionally Latin).

## Known limitations

- Fee changes/doctor name changes affect only future bookings (seeded appointments keep their stored fee —
  by design of the demo store).
- «بارگذاری فایل» / «پیوست تصویر گزارش» / «بارگذاری مدرک» are mock chips (frontend-only demo, no storage).
- Notification switches on /doctor/settings are local demo state only (labeled as such in UI).
- Blood types (`O+` etc.) come from seed data as Latin strings — left as-is (medical convention, not my file).
- The environment's dev server (system-managed) crashed twice during the session; I restarted it detached
  (`bun run dev` in background, ppid 1) to complete verification. If it is down, restart it the same way.

## Foundation gaps noticed (do NOT fix — outside my scope)

1. `bun run lint` fails on **`src/components/shared/panel-shell.tsx:226`** (react-hooks/set-state-in-effect
   error: `useEffect(() => setMounted(true), [])` in the theme toggle) — pre-existing, shared by all panels.
2. Warnings (unused eslint-disable directives) in `src/components/shared/data-table.tsx:153` and
   `src/components/shared/hydration-gate.tsx:30`; react-hooks/incompatible-library warning in
   `src/features/patient/consultations/new-consultation-dialog.tsx:81`.
3. Seed data embeds Latin-digit tracking codes inside transaction `description` strings («پرداخت نوبت
   NO-10001») — I work around it with `toFa()` in my page, but other panels may hit the same.
4. JalaliDatePicker popover does not close after selecting a day (no `onOpenChange` wiring) — minor UX nit,
   worked around with Escape/outside click during tests.
5. `Patient.bloodType` stored as Latin (`O+`).
