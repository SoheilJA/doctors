#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply fixes to src/mock/seed.ts (corrupted text, timeline math, dates)."""
import io, sys

path = "src/mock/seed.ts"
with io.open(path, "r", encoding="utf-8") as f:
    c = f.read()

reps = []

# 1) imports cleanup
reps.append((
'''import {
  CITIES,
  CLINIC_SERVICES,
  DEFAULT_COMMISSION_RATE,
  INSURERS,
  LAB_TESTS,
  LAB_ORDER_STEPS,
  LANGUAGES,
  SPECIALTIES,
  SPECIALTY_FEE_RANGE,
  TICKET_SLA_HOURS,''',
'''import {
  CITIES,
  DEFAULT_COMMISSION_RATE,
  INSURERS,
  LAB_TESTS,
  LAB_ORDER_STEPS,
  LANGUAGES,
  SPECIALTIES,
  SPECIALTY_FEE_RANGE,'''))

reps.append((
'''import { addDaysISO, dateToISO, jalaliMonthKey, subDaysISO, todayISO, nowISODateTime, weekdayIndex } from "@/lib/jalali";''',
'''import { addDaysISO, dateToISO, jalaliMonthKey, subDaysISO, todayISO, nowISODateTime } from "@/lib/jalali";'''))

# 2) plusHours helper
reps.append((
'''function personName(gender: "male" | "female"): string {''',
'''/** add N hours to an ISO datetime string, returning an ISO datetime string */
function plusHours(isoDateTime: string, hours: number): string {
  const d = new Date(isoDateTime);
  const shifted = new Date(d.getTime() + hours * 3600_000);
  return `${dateToISO(shifted)}T${String(shifted.getHours()).padStart(2, "0")}:${String(shifted.getMinutes()).padStart(2, "0")}:00`;
}

function personName(gender: "male" | "female"): string {'''))

# 3) bio english fragments
reps.append((
"عضو انجمن dermatology ایران و مدرس دوره‌های لیزر و زیبایی. حوزه‌های تخصصی: درمان آکنه و جوشگاه، درمان لک و melanosis،",
"عضو انجمن پوست ایران و مدرس دوره‌های لیزر و زیبایی. حوزه‌های تخصصی: درمان آکنه و جوشگاه، درمان لک و ملانوز،"))

# 4) patient birth years -> Gregorian
reps.append((
"      birthDateISO: `${int(1310 + Math.round(int(0, 50)), 1380)}-",
"      birthDateISO: `${int(1935, 2005)}-"))

# 5) family member birth years -> Gregorian
reps.append((
"            birthDateISO: `${int(1330, 1400)}-",
"            birthDateISO: `${int(1930, 2015)}-"))

# 6) consultation deadline via plusHours
reps.append((
'''    const createdAtISO = randDateTime(subDaysISO(today, createdDaysAgo), 9, 21);
    const deadlineISO = `${addDaysISO(subDaysISO(today, createdDaysAgo), deadlineHours >= 24 ? 1 : 0)}T${String((new Date(createdAtISO).getHours() + (deadlineHours % 24)) % 24).padStart(2, "0")}:00:00`;''',
'''    const createdAtISO = randDateTime(subDaysISO(today, createdDaysAgo), 9, 21);
    const deadlineISO = plusHours(createdAtISO, deadlineHours);'''))

# 7) transaction loop condition simplify
reps.append((
'''  for (const a of appointments) {
    if (a.paymentStatus !== "paid" && a.status !== "completed") continue;
    if (a.paymentStatus === "unpaid") continue;
    transactions.push({''',
'''  for (const a of appointments) {
    if (a.paymentStatus !== "paid") continue;
    transactions.push({'''))

# 8) ticket timeline rewrite
reps.append((
'''    if (opts.status !== "open") {
      firstResponseAtISO = randDateTime(subDaysISO(today, Math.max(0, daysAgo - (daysAgo > 0 ? 0.5 : 0) - 0)), 8, 22);
      messages.push({''',
'''    if (opts.status !== "open") {
      firstResponseAtISO = plusHours(createdAtISO, int(1, 8));
      messages.push({'''))

reps.append((
'''          text: pick(P.TICKET_USER_REPLIES),
          internal: false,
          attachments: [],
          sentAtISO: randDateTime(subDaysISO(today, Math.max(0, daysAgo - 1)), 8, 22),
        });
      }
      if (bool(0.4)) {
        messages.push({
          id: nid("tmsg"),
          senderId: supportAgents[0].id,
          senderRole: "support",
          senderName: supportAgents[0].name,
          text: pick(P.INTERNAL_NOTES),
          internal: true,
          attachments: [],
          sentAtISO: randDateTime(subDaysISO(today, Math.max(0, daysAgo - 1)), 9, 20),
        });
      }
    }
    if (opts.status === "closed") {
      resolvedAtISO = randDateTime(subDaysISO(today, Math.max(0, daysAgo - 1)), 10, 20);
    }''',
'''          text: pick(P.TICKET_USER_REPLIES),
          internal: false,
          attachments: [],
          sentAtISO: plusHours(firstResponseAtISO, int(2, 12)),
        });
        if (bool(0.4)) {
          messages.push({
            id: nid("tmsg"),
            senderId: supportAgents[0].id,
            senderRole: "support",
            senderName: supportAgents[0].name,
            text: pick(P.TICKET_SUPPORT_REPLIES),
            internal: false,
            attachments: [],
            sentAtISO: plusHours(firstResponseAtISO, int(4, 20)),
          });
        }
      }
      if (bool(0.4)) {
        messages.push({
          id: nid("tmsg"),
          senderId: supportAgents[0].id,
          senderRole: "support",
          senderName: supportAgents[0].name,
          text: pick(P.INTERNAL_NOTES),
          internal: true,
          attachments: [],
          sentAtISO: plusHours(firstResponseAtISO, int(1, 4)),
        });
      }
    }
    if (opts.status === "closed") {
      resolvedAtISO = plusHours(messages[messages.length - 1].sentAtISO, int(3, 30));
    }'''))

# 9) remove unused mainDoctorNext line
reps.append((
'''  const mainDoctorNext = appointments.find((a) => a.doctorId === mainDoctor.id && a.date > today && a.status === "confirmed")!;
  mkNotif("doctor", mainDoctor.id, "نوبت جدید ثبت شد",''',
'''  mkNotif("doctor", mainDoctor.id, "نوبت جدید ثبت شد",'''))

# 10) article corruptions
reps.append((
"سرما و بادهای زمستانی سد دفاعی پوست را تضعیف می‌کنند؛ با这几个 ساده پوست خود را حفظ کنید.",
"سرما و بادهای زمستانی سد دفاعی پوست را تضعیف می‌کنند؛ با این چند توصیه ساده پوست خود را حفظ کنید."))
reps.append((
"جرم‌گیری سالانه و معاینه مناملات، پوسیدگی‌های اولیه",
"جرم‌گیری سالانه و معاینه منظم، پوسیدگی‌های اولیه"))
reps.append((
"گام‌های کوچک پیوسته بهتر از ورزش‌های پرش disbanded است؛ استمرار مهم‌تر از شدت است.",
"گام‌های کوچک و پیوسته، بهتر از ورزش‌های شدید و ناگهانی است؛ استمرار مهم‌تر از شدت است."))

# 11) monthlyStats newDoctors simplify
reps.append((
'''      newPatients: patients.filter((p) => jalaliMonthKey(p.createdAtISO) === key).length || int(3, 8),
      newDoctors: doctors.filter((d) => back === 0 && int(0, 3) === 0).length || (back === 0 ? 1 : 0),''',
'''      newPatients: patients.filter((p) => jalaliMonthKey(p.createdAtISO) === key).length || int(3, 8),
      newDoctors: back === 0 ? 1 : 0,'''))

# 12) remove trailing re-export line
reps.append((
'''
export type { AppointmentStatus, LabOrderStatus, VisitType, TicketCategory, TicketPriority, TicketStatus };
''', "\n"))

# 13) move TicketMessageT type before addTicket
reps.append((
'''  const ticketCategories = Object.keys(P.TICKET_SUBJECTS);
''',
'''  const ticketCategories = Object.keys(P.TICKET_SUBJECTS);
  type TicketMessageT = Ticket["messages"][number];
'''))
reps.append((
'''
  type TicketMessageT = Ticket["messages"][number];
  const cat = (c: string) => c as TicketCategory;''',
'''
  const cat = (c: string) => c as TicketCategory;'''))

# 14) resultNote wording
reps.append((
"همه مقادیر در محدوده نرمال هستند؛ نتیجه تفصیلی در PDF پیوست.",
"همه مقادیر در محدوده نرمال هستند؛ نتیجه تفصیلی در فایل PDF پیوست است."))

fail = 0
applied = 0
skipped = 0
for old, new in reps:
    if new in c and old not in c:
        skipped += 1  # already applied earlier
    elif old not in c:
        print("MISSING:", old[:80].replace("\n", " "))
        fail += 1
    else:
        c = c.replace(old, new, 1)
        applied += 1
print(f"applied={applied} skipped(already)={skipped} missing={fail}")

if fail:
    print(f"{fail} patterns missing; aborting without write")
    sys.exit(1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(c)
print("all fixes applied OK")
