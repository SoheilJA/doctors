"use client";

/**
 * پرونده پزشکی — خط زمانی ویزیت‌ها، آزمایش‌ها و مشاوره‌ها + فایل‌ها و خلاصه سلامت.
 */

import { useMemo, useState } from "react";
import { ClipboardList, Download, FileText, FlaskConical, MessagesSquare, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { faNum, toFa, toman } from "@/lib/fa";
import { faDate } from "@/lib/jalali";
import { APPOINTMENT_STATUS_LABELS, LAB_ORDER_STATUS_LABELS, SPECIALTY_LABELS, VISIT_TYPE_LABELS } from "@/lib/constants";
import type { LabOrder } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { useCurrentPatient } from "@/features/patient/helpers";

type FilterId = "all" | "visits" | "labs" | "consults";

type TimelineEntry =
  | {
      kind: "visit";
      id: string;
      date: string;
      doctorName: string;
      specialty: string;
      reason: string;
      notes: string;
      prescription?: string;
      status: string;
      statusLabel: string;
      visitTypeLabel: string;
    }
  | {
      kind: "lab";
      id: string;
      date: string;
      labName: string;
      testsSummary: string;
      resultNote?: string;
      totalFee: number;
      code: string;
      statusLabel: string;
    }
  | {
      kind: "consult";
      id: string;
      date: string;
      doctorName: string;
      subject: string;
      prescriptionNote?: string;
      code: string;
    };

export default function MedicalRecordsPage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const appointments = useAppStore((s) => s.appointments);
  const labOrders = useAppStore((s) => s.labOrders);
  const consultations = useAppStore((s) => s.consultations);
  const doctors = useAppStore((s) => s.doctors);
  const centers = useAppStore((s) => s.centers);
  const [filter, setFilter] = useState<FilterId>("all");

  const entries = useMemo<TimelineEntry[]>(() => {
    if (!patient) return [];
    const list: TimelineEntry[] = [];

    for (const a of appointments) {
      if (a.patientId !== patient.id || a.status !== "completed") continue;
      const doc = doctors.find((d) => d.id === a.doctorId);
      if (!doc) continue;
      list.push({
        kind: "visit",
        id: a.id,
        date: a.date,
        doctorName: doc.name,
        specialty: SPECIALTY_LABELS[doc.specialtyId],
        reason: a.reason || "ویزیت",
        notes: a.notes,
        prescription: a.prescription,
        status: a.status,
        statusLabel: APPOINTMENT_STATUS_LABELS[a.status],
        visitTypeLabel: VISIT_TYPE_LABELS[a.visitType],
      });
    }

    for (const l of labOrders) {
      if (l.patientId !== patient.id || l.status !== "received") continue;
      const lab = centers.find((c) => c.id === l.labId);
      list.push({
        kind: "lab",
        id: l.id,
        date: l.createdAtISO.split("T")[0],
        labName: lab?.name ?? "آزمایشگاه",
        testsSummary: l.tests.map((t) => t.name).join("، "),
        resultNote: l.resultNote,
        totalFee: l.totalFee,
        code: l.code,
        statusLabel: LAB_ORDER_STATUS_LABELS[l.status],
      });
    }

    for (const c of consultations) {
      if (c.patientId !== patient.id || c.status !== "closed") continue;
      const doc = doctors.find((d) => d.id === c.doctorId);
      if (!doc) continue;
      list.push({
        kind: "consult",
        id: c.id,
        date: c.createdAtISO.split("T")[0],
        doctorName: doc.name,
        subject: c.subject,
        prescriptionNote: c.prescriptionNote,
        code: c.code,
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [patient, appointments, labOrders, consultations, doctors, centers]);

  const filtered = useMemo(
    () =>
      entries.filter((e) =>
        filter === "all" ? true : filter === "visits" ? e.kind === "visit" : filter === "labs" ? e.kind === "lab" : e.kind === "consult"
      ),
    [entries, filter]
  );

  /** mock files: از نسخه‌های ویزیت‌ها + جواب آزمایش‌ها */
  const files = useMemo(() => {
    if (!patient) return [];
    const out: { id: string; title: string; meta: string }[] = [];
    for (const e of entries) {
      if (e.kind === "visit" && e.prescription) {
        out.push({ id: `rx-${e.id}`, title: `نسخه ${e.doctorName}`, meta: `${faDate(e.date)} • PDF` });
      }
      if (e.kind === "lab") {
        out.push({ id: `lab-${e.id}`, title: `جواب آزمایش ${toFa(e.code)}`, meta: `${e.labName} • PDF` });
      }
      if (e.kind === "consult" && e.prescriptionNote) {
        out.push({ id: `con-${e.id}`, title: `توصیه ${e.doctorName}`, meta: `${e.subject} • متن` });
      }
    }
    return out;
  }, [entries, patient]);

  const meta = {
    visit: { icon: Stethoscope, label: "ویزیت", cls: "text-teal-600 dark:text-teal-400 bg-teal-500/12" },
    lab: { icon: FlaskConical, label: "آزمایش", cls: "text-violet-600 dark:text-violet-400 bg-violet-500/12" },
    consult: { icon: MessagesSquare, label: "مشاوره", cls: "text-sky-600 dark:text-sky-400 bg-sky-500/12" },
  } as const;

  return (
    <div className="space-y-5">
      <PageHeader
        title="پرونده پزشکی"
        description="سابقه ویزیت‌ها، آزمایش‌ها، نسخه‌ها و فایل‌های سلامت شما."
        loading={loading}
        actions={
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterId)}>
            <SelectTrigger className="w-40" aria-label="فیلتر نوع سابقه">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="visits">ویزیت‌ها</SelectItem>
              <SelectItem value="labs">آزمایش‌ها</SelectItem>
              <SelectItem value="consults">مشاوره‌ها</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* health summary chips */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <ClipboardList className="size-4.5 text-primary" aria-hidden />
          <span className="text-xs font-medium text-muted-foreground">خلاصه سلامت:</span>
          {patient && (
            <>
              <Badge variant="secondary" className="font-bold tabular-nums">گروه خونی {toFa(patient.bloodType)}</Badge>
              {patient.allergies.map((a) => (
                <Badge key={a} variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400">
                  حساسیت: {a}
                </Badge>
              ))}
              {patient.chronicConditions.map((c) => (
                <Badge key={c} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {c}
                </Badge>
              ))}
              <Badge variant="outline">{patient.insurance}</Badge>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* timeline */}
        <div className="space-y-4 xl:col-span-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : filtered.length ? (
            <ol className="relative space-y-4 border-s-2 ps-5" aria-label="خط زمانی پرونده">
              {filtered.map((e) => {
                const m = meta[e.kind];
                const Icon = m.icon;
                return (
                  <li key={`${e.kind}-${e.id}`} className="relative">
                    <span
                      className={cn("absolute -start-[37px] grid size-7 place-items-center rounded-full", m.cls)}
                      aria-hidden
                    >
                      <Icon className="size-4" />
                    </span>
                    <Card>
                      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                        <CardTitle className="text-sm font-bold">
                          {e.kind === "visit" ? e.doctorName : e.kind === "lab" ? e.labName : e.doctorName}
                          <span className="ms-2 text-xs font-normal text-muted-foreground">
                            {e.kind === "visit" ? e.specialty : e.kind === "lab" ? "آزمایشگاه" : "مشاوره آنلاین"}
                          </span>
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs tabular-nums">{faDate(e.date)}</Badge>
                          <Badge variant="secondary" className="text-xs">{m.label}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {e.kind === "visit" && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              علت مراجعه: <span className="text-foreground">{e.reason}</span> • نوع: {e.visitTypeLabel}
                            </p>
                            {e.notes && (
                              <p className="rounded-xl bg-muted/60 p-2.5 text-xs leading-relaxed">
                                <b className="text-muted-foreground">یادداشت پزشک:</b> {e.notes}
                              </p>
                            )}
                            {e.prescription && <PrescriptionBlock text={e.prescription} />}
                            <StatusBadge status={e.status} label={e.statusLabel} />
                          </>
                        )}
                        {e.kind === "lab" && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              آزمایش‌ها: <span className="text-foreground">{e.testsSummary}</span>
                            </p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              کد سفارش: <span className="text-foreground">{toFa(e.code)}</span> • مبلغ: {toman(e.totalFee)}
                            </p>
                            {e.resultNote && (
                              <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-2.5 text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
                                <b>نتیجه:</b> {e.resultNote}
                              </p>
                            )}
                            <StatusBadge status="received" label={e.statusLabel} />
                          </>
                        )}
                        {e.kind === "consult" && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              موضوع: <span className="text-foreground">{e.subject}</span> • کد: {toFa(e.code)}
                            </p>
                            {e.prescriptionNote && <PrescriptionBlock text={e.prescriptionNote} />}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="سابقه‌ای برای نمایش نیست"
              description="پس از انجام ویزیت، آزمایش یا مشاوره، سوابق در این خط زمانی ثبت می‌شوند."
            />
          )}
        </div>

        {/* files */}
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4.5 text-primary" aria-hidden />
              نسخه‌ها و فایل‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : files.length ? (
              <div className="grid gap-2">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{f.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{f.meta}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`دانلود ${f.title}`}
                      onClick={() => toast.success("دانلود شبیه‌سازی شد", { description: `${f.title}.pdf` })}
                    >
                      <Download className="size-4" aria-hidden />
                    </Button>
                  </div>
                ))}
                <p className="pt-1 text-center text-[11px] text-muted-foreground">
                  {faNum(files.length)} فایل — دانلود در نسخه نمایشی شبیه‌سازی می‌شود.
                </p>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">فایلی برای نمایش وجود ندارد.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PrescriptionBlock({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-2.5">
      <FileText className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <p className="whitespace-pre-wrap text-xs leading-relaxed">
        <b className="text-emerald-700 dark:text-emerald-400">نسخه:</b>
        {"\n"}
        {text}
      </p>
    </div>
  );
}
