# Foundation Doc — «دکترها» Persian RTL Healthcare Demo

READ THIS FILE COMPLETELY BEFORE WRITING ANY CODE.
You are building pages of a **frontend-only demo** (no backend, no API routes, no DB).
ALL data lives in the Zustand store seeded at first load. Everything is Persian (fa-IR), RTL, Jalali.

## Non-negotiable rules

1. **Persian only** in every user-visible string (labels, toasts, validation, empty states, chart ticks).
   Only code/comments/filenames are English. Use proper Persian typography (ZWNJ where needed: «می‌شود»).
2. **RTL everywhere.** `<html dir="rtl">` is set. Use Tailwind **logical** utilities only:
   `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `border-s`, `border-e`.
   NEVER use `ml-`, `mr-`, `pl-`, `pr-`, `left-*`, `right-*`, `text-left`, `text-right`.
   Mirror directional icons: in RTL, "next/forward" = `ChevronLeft`, "back" = `ChevronRight`.
3. **Numbers** must be Persian digits — ALWAYS format with helpers from `@/lib/fa`:
   `faNum(n)` (number), `toman(n)` («۲۵۰٬۰۰۰ تومان»), `tomanCompact(n)`, `toFa(str)`, `faPercent(n)`, `faPhone(p)`, `parseFaNumber(s)`.
   Never render raw Arabic-numeral numbers in UI (tracking codes, phones, etc. → wrap with `toFa()`).
4. **Dates** are stored as ISO strings `YYYY-MM-DD` (datetimes `YYYY-MM-DDTHH:mm:ss`) and MUST be
   displayed via `@/lib/jalali` helpers (Jalali/Shamsi + Persian digits):
   `faDate(iso)` «پنجشنبه ۱۲ آبان ۱۴۰۵», `faDateShort`, `faDateMedium`, `faDateNumeric`, `faDateTime(iso)`,
   `faDateTimeShort`, `faTime('14:30')`, `faWeekday(iso)`, `faFromNow(iso)` (relative), `faDuration(min)`,
   `faMonthLabel(monthKey)`, `todayISO()`, `addDaysISO`, `subDaysISO`, `diffDays`, `weekdayIndex` (0=شنبه…6=جمعه),
   `JALALI_WEEKDAYS`, `JALALI_WEEKDAYS_SHORT`, `JALALI_MONTHS`, `eachDayISO`, `startOfWeekISO` (Saturday), `endOfWeekISO`.
5. **No new dependencies.** Everything needed is installed (recharts, @tanstack/react-table,
   react-hook-form, zod, @hookform/resolvers, zustand, sonner, next-themes, framer-motion, date-fns-jalali,
   react-day-picker, lucide-react, shadcn/ui in `src/components/ui`).
6. Use existing shadcn/ui components — check `src/components/ui` first (button, card, table, tabs, dialog,
   sheet, drawer, dropdown-menu, select, input, textarea, form, badge, alert, alert-dialog, avatar, skeleton,
   popover, tooltip, command, calendar, chart, progress, separator, switch, radio-group, scroll-area, sonner…).
7. **Do not edit files outside your assigned scope** (list given in your task). In particular, NEVER touch:
   `src/components/ui/*`, `src/components/shared/panel-shell.tsx`, `src/lib/*`, `src/store/*`, `src/mock/*`,
   `src/types/*`, `src/app/layout.tsx`, `src/app/globals.css`, panel `layout.tsx` files, other panels' folders.
8. **Validation**: use `react-hook-form` + `zod` with **Persian error messages** (`@/hookform/resolvers/zod` → `zodResolver`).
   zod v4 is installed. Keep schemas near the page/component.
9. **Loading**: pages simulate loading via `useDemoLoading()` from `@/components/shared/hydration-gate`
   (returns true ~300–600ms + until store hydrated) — pass to `loading` props (StatCard, DataTable, ChartCard, PageHeader).
10. **Toasts**: `import { toast } from "sonner"` — `toast.success("…")`, `toast.error("…")`, `toast.info(...)`,
    `toast("…", { description: "…" })`. Persian only. Destructive actions use `AlertDialog` confirm first.
11. **Type safety**: no `any`. Import domain types from `@/types`.
12. Run `bun run lint` when done. NEVER run `bun run build` or `bun run dev` (dev server is already running
    on port 3000; check the tail of `/home/z/my-project/dev.log` for compile errors of your routes).
13. Client components: add `"use client"` at top of every page/component file (all pages need store access).
14. Components you build for a panel go in `src/features/<panel-name>/…` (one folder per page/feature is fine).
    Pages go in `src/app/<panel>/…` exactly matching the nav routes.
15. Keep code DRY: reuse `@/components/shared/*` (see below) and central labels from `@/lib/constants`.

## The store — `useAppStore` (`@/store/app-store`)

Single mock DB (persisted). Access data: `const doctors = useAppStore(s => s.doctors)` etc.
Slices: `specialties, services, doctors, patients, appointments, consultations, reviews, labOrders,
transactions, settlements, tickets, staff, cannedReplies, faqs, articles, banners, centers, discountCodes,
auditLog, notifications, monthlyStats, favorites`.

Main demo entities: `doctors.find(d => d.isDemo)` = دکتر سارا محمدی (پوست و مو), `patients.find(p => p.isDemo)` = علی رضایی,
admin = staff `stf-0001` محمد کریمی, support agent = `stf-0002` نگار حسینی.

Current session: `const { session } = useAuthStore()` (`@/store/auth-store`) → `{ role, userId, name, doctorId?, patientId?, avatarHue }`.

Key actions (all in `useAppStore(s => s.<action>)`):

- **Appointments**: `bookAppointment({doctorId, patientId, forFamilyMember?, date, time, visitType, reason?, payNow?}) → Appointment`,
  `updateAppointment(id, patch)`, `setAppointmentStatus(id, status, actorName?)` (auto-refund transaction when cancelling a paid one),
  `rescheduleAppointment(id, date, time)`.
- **Consultations**: `createConsultation({doctorId, patientId, type, subject, question}) → {consultation}`,
  `addConsultationMessage(consultationId, {sender:'patient'|'doctor', text, attachments?})`,
  `setConsultationStatus(id, status)`, `setConsultationPrescription(id, note)`.
- **Reviews**: `addReview({doctorId, patientId, appointmentId?, rating, comment})`,
  `replyToReview(id, reply)`, `setReviewStatus(id, status, actorName?)`.
- **Labs**: `createLabOrder({patientId, labId, doctorId?, tests, homeSampling, prescriptionFile?}) → LabOrder`,
  `setLabOrderStatus(id, status)` (appends history entry, notification when `received`),
  `payLabOrder(id)` (transaction + step to `paid`).
- **Wallet**: `topupWallet(patientId, amount, discountCode?)`.
- **Settlements**: `requestSettlement({doctorId, amount, bankName, iban}) → Settlement` (notifies admin),
  `updateSettlement(id, patch, actorName?)` (auto payout transaction + doctor notification when `status:'paid'`).
- **Tickets**: `createTicket({creatorId, creatorRole, creatorName, subject, category, priority, body, relatedEntity?}) → Ticket`,
  `addTicketMessage(ticketId, {senderId, senderRole, senderName, text, internal?, attachments?})` (status transitions automatic:
  staff reply → `answered`, creator reply → `in-progress`; notifications flow both ways),
  `updateTicket(id, {status|priority|category|assignedAgentId})`, `closeTicket(id, actorName?)`, `reopenTicket(id)`, `rateTicket(id, rating, comment?)`.
- **Doctors**: `updateDoctor(id, patch)`, `updateDoctorSchedule(id, weeklySchedule)`, `addDoctorOffDay(id, {startDate,endDate,reason})`,
  `removeDoctorOffDay(id, offDayId)`, `addDoctorOverride(id, {date, ranges, note?})`, `removeDoctorOverride(id, overrideId)`,
  `setDoctorVerification(id, status, actorName, reason?)`, `setDoctorAccountStatus(id, status, actorName)`.
- **Patients**: `updatePatient(id, patch)`, `blockPatient(id, blocked, actorName)`,
  `addFamilyMember(patientId, member)`, `updateFamilyMember(patientId, memberId, patch)`, `removeFamilyMember(patientId, memberId)`,
  `toggleFavorite(patientId, doctorId)`.
- **Content/Catalog**: `upsertArticle/deleteArticle`, `upsertBanner/deleteBanner`, `upsertSpecialty/deleteSpecialty`,
  `upsertService/deleteService`, `upsertCenter/deleteCenter`, `upsertDiscountCode/deleteDiscountCode`,
  `upsertStaffUser`, `updateStaffPermissions(id, perms)`, `toggleStaffActive(id, actorName)`,
  `upsertCannedReply/deleteCannedReply`, `upsertFaq/deleteFaq`.
- **Meta**: `addAuditLog({actorName, actorRole, action, target})`, `pushNotification({role, userId?, title, body, link?})`,
  `markNotificationRead(id)`, `markAllNotificationsRead(role, userId)`, `resetDemoData()`.

## Slot / schedule logic — `@/lib/schedule`

- `generateSlotsForDate(doctor, dateISO, allAppointments)` → `GeneratedSlot[] {time, visitType, duration, maxPerSlot, bookedCount, remaining}`
  (respects weekly schedule, offDays, per-date overrides, and booked appointments).
- `effectiveRanges(doctor, dateISO)`, `isDoctorWorking(doctor, dateISO)`, `findOffDay(doctor, dateISO)`,
  `nextAvailableDate(doctor, appointments, horizon?)`, `workingDates(doctor, fromISO, toISO)`.
- Zod schemas: `timeRangeSchema`, `dayScheduleSchema` (Persian errors, overlap validation).
- `validateWeeklySchedule(schedule)` → per-weekday Persian error map; `findConflictingAppointments(doctor, appointments)` → booked
  appointments that would conflict with the current schedule draft.

## Central labels — `@/lib/constants` (use these, never hardcode)

- `ROLE_LABELS`, `ROLE_HOME`, `VISIT_TYPE_LABELS`,
- `APPOINTMENT_STATUS_LABELS`, `PAYMENT_STATUS_LABELS`, `CONSULTATION_STATUS_LABELS`, `TICKET_STATUS_LABELS`,
  `TICKET_PRIORITY_LABELS`, `TICKET_CATEGORY_LABELS`, `TICKET_SLA_HOURS`, `TICKET_STATUS_ORDER`,
  `LAB_ORDER_STATUS_LABELS`, `LAB_ORDER_STEPS`, `SETTLEMENT_STATUS_LABELS`, `VERIFICATION_STATUS_LABELS`,
  `DOCTOR_ACCOUNT_STATUS_LABELS`, `PUBLISH_STATUS_LABELS`, `MODERATION_STATUS_LABELS`, `TRANSACTION_KIND_LABELS`,
  `SPECIALTIES` (id/title/description), `SPECIALTY_LABELS`, `CITIES`, `INSURERS`, `LANGUAGES`, `DURATIONS`,
  `LAB_TESTS` (id/name/price), `CLINIC_SERVICES`, `SPECIALTY_FEE_RANGE`, `DEFAULT_COMMISSION_RATE`, `COMMISSION_RANGE`,
  `badgeStyleFor(statusKey)` (badge colors), `APP_NAME`.
- Doctor fees per visit type are on the Doctor object: `visitFee, phoneFee, textFee, videoFee` (Toman ints).

## Shared components — `@/components/shared/*` (READ THEIR PROPS IN SOURCE)

- `PageHeader({title, description?, actions?, loading?})`
- `StatCard({title, value, icon, hint?, trend?, tone?, loading?, onClick?})` — tone: primary|sky|amber|emerald|rose|violet
- `StatusBadge({status, label?, withDot?})` — any status key from constants; put the Persian label from constants in `label`.
- `EmptyState({icon?, title, description?, action?, className?})`
- `DataTable<TData, TValue>({columns, data, searchable?, searchPlaceholder?, toolbar?, loading?, emptyTitle, emptyDescription?, emptyIcon?, emptyAction?, mobileCard?, pageSize?, exportCsvName?, csvRows?, onRowClick?, className?})`
  — TanStack wrapper: sorting, global search, pagination with Persian digits, skeleton loading, mobile card fallback,
  CSV export button (client-side, BOM). Pass `mobileCard` for a nice mobile layout.
- `ChartCard({title, description?, config, children, action?, loading?, legend?, height?})` — wraps shadcn `ChartContainer`.
  Build the recharts chart as children (`<BarChart>…`, `<AreaChart>…`, `<PieChart>…`). Use `config` keys → `fill: "var(--color-KEY)"`.
  Persian tick labels; format numbers with `faNum` in `tickFormatter` and in `ChartTooltipContent` (custom `formatter`/`labelFormatter`).
  Recharts internals are LTR (set in CSS); do NOT wrap charts in `dir="ltr"` yourself.
- `JalaliDatePicker({value?, onChange(iso?), disabled?(date), placeholder?, className?, disabledInput?})`
  — react-day-picker v9 Persian (Jalali) calendar in a popover; `value` is ISO string.
- `TicketThread({ticket, perspective:'creator'|'agent', senderId, senderRole, senderName, onAfterClose?, className?})`
  — full thread UI incl. attachments mock, internal notes (agent), canned replies (agent), rating (creator after close).
  Agent-side status/assign controls are composed by the page AROUND this component.
- `RatingStars({value, count?, size?, interactive?, onChange?})`
- `UserAvatar({name, hue, size:'sm'|'md'|'lg'|'xl'})` — initials avatar (never broken images).
- `useDemoLoading()`, `useStoreHydrated()`, `StoreHydration` — `@/components/shared/hydration-gate`
- `PanelShell` (already wired in each panel layout.tsx) — sidebar/topbar/guard/notifications/user menu. Do NOT recreate.

## Charts (Recharts via shadcn chart)

```tsx
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartTooltipContent, ChartTooltip, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
const config = { revenue: { label: "درآمد", color: "var(--chart-1)" } } satisfies ChartConfig;
<ChartCard title="درآمد" config={config} loading={loading}>
  <BarChart data={data} margin={{left: 0, right: 0}}>
    <CartesianGrid vertical={false} strokeDasharray="3 3" />
    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed />
    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => faNumCompact(v)} width={48} />
    <ChartTooltip content={<ChartTooltipContent labelFormatter={(l) => String(l)} formatter={(v) => [toman(Number(v)), "درآمد"]} />} />
    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={6} />
  </BarChart>
</ChartCard>
```
Use `reversed` on XAxis when the x axis is time (RTL reading). Persian labels everywhere; numbers through `faNum`/`toman`.
`var(--chart-1..5)` colors are defined. For donuts use `PieChart` + `Pie` with `innerRadius`, `legend={<ChartLegend .../>}`.

## Tables pattern

```tsx
const columns: ColumnDef<Appointment, string>[] = [ ... accessorKey / cell: ({row}) => <StatusBadge .../> ];
<DataTable columns={columns} data={list} loading={loading} searchPlaceholder="جستجو…" emptyTitle="موردی یافت نشد"
  mobileCard={(a) => (<div className="rounded-xl border p-3">…</div>)} csvRows={(a) => ({ 'کد': a.code, … })} exportCsvName="appointments" />
```

## Money & codes

- Amounts are Toman integers. Display via `toman(n)` / `tomanCompact(n)`.
- Tracking codes look like `NO-10432` — display with `toFa(a.code)`.

## Panel shell structure

Each panel layout renders `PanelShell role=…` with sidebar items defined in `@/lib/nav.ts` (PANEL_NAVS).
Sidebar highlights active route. Breadcrumb labels come from nav item labels; for deeper pages the last crumb falls back to «جزئیات» — pass a proper page title via `PageHeader` anyway.

## Where files go (per-panel)

```
src/app/<panel>/<route>/page.tsx        ← page (client component)
src/features/<panel>/<route>/…          ← page-specific components if large
```

## Quality bar (check before you say done)

- Every sidebar item of your panel leads to a REAL page with seeded data (no «به‌زودی», no dead links).
- Every list/table: loading skeleton + empty state + mobile fallback.
- Every form validates with Persian zod messages and updates the store; success → Persian toast.
- Destructive actions (cancel, delete, close) → AlertDialog confirm.
- Responsive: mobile-first; test mentally at 375px width (sidebar hidden, cards stack).
- `bun run lint` passes and your routes compile without errors in dev.log.
