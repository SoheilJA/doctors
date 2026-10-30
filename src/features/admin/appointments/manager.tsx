"use client";

/**
 * /admin/appointments — نوبت‌ها و مشاوره‌های آنلاین:
 * تب نوبت‌ها (فیلتر وضعیت/نوع/بازه تاریخ + خروجی CSV + شیت تغییر وضعیت و ثبت پرداخت)
 * و تب مشاوره‌ها (مکالمه فقط‌خواندنی + تغییر وضعیت).
 */

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { CalendarDays, MessageSquareText, Paperclip, Stethoscope } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  APPOINTMENT_STATUS_LABELS,
  CONSULTATION_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  VISIT_TYPE_LABELS,
  type AppointmentStatus,
  type ConsultationStatus,
  type VisitType,
} from "@/lib/constants";
import { faDateMedium, faDateShort, faDateTimeShort, faTime } from "@/lib/jalali";
import { faNum, toFa, toman } from "@/lib/fa";
import { useAdminPanel } from "@/features/admin/shared";
import type { Appointment, Consultation } from "@/types";

const ALL = "all";

type ApptStatusFilter = AppointmentStatus | typeof ALL;
type VisitTypeFilter = VisitType | typeof ALL;
type ConsultStatusFilter = ConsultationStatus | typeof ALL;

export function AdminAppointmentsManager() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);
  const updateAppointment = useAppStore((s) => s.updateAppointment);
  const setConsultationStatus = useAppStore((s) => s.setConsultationStatus);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  /* ------------------------------ appointments ------------------------------ */

  const [apptStatus, setApptStatus] = useState<ApptStatusFilter>(ALL);
  const [visitType, setVisitType] = useState<VisitTypeFilter>(ALL);
  const [fromISO, setFromISO] = useState<string | undefined>();
  const [toISO, setToISO] = useState<string | undefined>();
  const [apptSearch, setApptSearch] = useState("");

  const [apptDetailId, setApptDetailId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<Appointment | null>(null);

  const apptDetail = apptDetailId ? panel.appointmentMap.get(apptDetailId) ?? null : null;

  const patientName = useCallback(
    (a: Appointment) => a.forFamilyMember?.name ?? panel.patientMap.get(a.patientId)?.name ?? "بیمار",
    [panel.patientMap],
  );

  const filteredAppointments = useMemo(() => {
    const q = apptSearch.trim().toLowerCase();
    return panel.appointments
      .filter((a) => {
        if (apptStatus !== ALL && a.status !== apptStatus) return false;
        if (visitType !== ALL && a.visitType !== visitType) return false;
        if (fromISO && a.date < fromISO) return false;
        if (toISO && a.date > toISO) return false;
        if (q) {
          const doctor = panel.doctorMap.get(a.doctorId)?.name ?? "";
          const haystack = `${a.code} ${patientName(a)} ${doctor}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
  }, [panel.appointments, apptStatus, visitType, fromISO, toISO, apptSearch, panel.doctorMap, patientName]);

  const changeStatus = (a: Appointment, status: AppointmentStatus) => {
    setAppointmentStatus(a.id, status, panel.actorName);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: "تغییر وضعیت نوبت",
      target: `${a.code} → ${APPOINTMENT_STATUS_LABELS[status]}`,
    });
    if (status === "cancelled" && a.paymentStatus === "paid") {
      toast(`نوبت ${toFa(a.code)} لغو شد`, { description: "مبلغ پرداختی به کیف پول کاربر بازگشت داده شد." });
    } else {
      toast.success(`وضعیت نوبت ${toFa(a.code)} به «${APPOINTMENT_STATUS_LABELS[status]}» تغییر کرد`);
    }
  };

  const markPaid = (a: Appointment) => {
    updateAppointment(a.id, { paymentStatus: "paid" });
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: "ثبت پرداخت نوبت",
      target: `${a.code} — ${toman(a.fee)}`,
    });
    toast.success(`پرداخت نوبت ${toFa(a.code)} ثبت شد`, { description: toman(a.fee) });
  };

  const apptColumns: ColumnDef<Appointment>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{toFa(row.original.code)}</span>,
    },
    {
      id: "patient",
      header: "بیمار",
      cell: ({ row }) => (
        <span className="max-w-36 truncate text-sm">
          {row.original.forFamilyMember && (
            <Badge variant="outline" className="me-1 text-[10px]">
              عضو خانواده
            </Badge>
          )}
          {patientName(row.original)}
        </span>
      ),
    },
    {
      id: "doctor",
      header: "پزشک",
      cell: ({ row }) => (
        <span className="max-w-36 truncate text-sm text-muted-foreground">
          {panel.doctorMap.get(row.original.doctorId)?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "date",
      header: "تاریخ",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs tabular-nums">
          {faDateShort(row.original.date)} · {faTime(row.original.time)}
        </span>
      ),
    },
    {
      accessorKey: "visitType",
      header: "نوع",
      cell: ({ row }) => <Badge variant="outline">{VISIT_TYPE_LABELS[row.original.visitType]}</Badge>,
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={APPOINTMENT_STATUS_LABELS[row.original.status]} />,
    },
    {
      accessorKey: "paymentStatus",
      header: "پرداخت",
      cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} label={PAYMENT_STATUS_LABELS[row.original.paymentStatus]} />,
    },
    {
      accessorKey: "fee",
      header: "مبلغ",
      cell: ({ row }) => <span className="whitespace-nowrap text-sm tabular-nums">{toman(row.original.fee)}</span>,
    },
  ];

  /* ------------------------------ consultations ------------------------------ */

  const [consultStatus, setConsultStatus] = useState<ConsultStatusFilter>(ALL);
  const [consultSearch, setConsultSearch] = useState("");
  const [consultDetailId, setConsultDetailId] = useState<string | null>(null);
  const consultDetail = consultDetailId ? panel.consultationMap.get(consultDetailId) ?? null : null;

  const filteredConsultations = useMemo(() => {
    const q = consultSearch.trim().toLowerCase();
    return panel.consultations
      .filter((c) => {
        if (consultStatus !== ALL && c.status !== consultStatus) return false;
        if (q) {
          const patient = panel.patientMap.get(c.patientId)?.name ?? "";
          const doctor = panel.doctorMap.get(c.doctorId)?.name ?? "";
          const haystack = `${c.code} ${c.subject} ${patient} ${doctor}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  }, [panel.consultations, consultStatus, consultSearch, panel.patientMap, panel.doctorMap]);

  const changeConsultStatus = (c: Consultation, status: ConsultationStatus) => {
    setConsultationStatus(c.id, status);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: "تغییر وضعیت مشاوره",
      target: `${c.code} → ${CONSULTATION_STATUS_LABELS[status]}`,
    });
    toast.success(`وضعیت مشاوره ${toFa(c.code)} به «${CONSULTATION_STATUS_LABELS[status]}» تغییر کرد`);
  };

  const consultColumns: ColumnDef<Consultation>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{toFa(row.original.code)}</span>,
    },
    {
      id: "patient",
      header: "بیمار",
      cell: ({ row }) => (
        <span className="max-w-32 truncate text-sm">{panel.patientMap.get(row.original.patientId)?.name ?? "بیمار"}</span>
      ),
    },
    {
      id: "doctor",
      header: "پزشک",
      cell: ({ row }) => (
        <span className="max-w-32 truncate text-sm text-muted-foreground">
          {panel.doctorMap.get(row.original.doctorId)?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "نوع",
      cell: ({ row }) => <Badge variant="outline">{VISIT_TYPE_LABELS[row.original.type]}</Badge>,
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={CONSULTATION_STATUS_LABELS[row.original.status]} />,
    },
    {
      accessorKey: "subject",
      header: "موضوع",
      cell: ({ row }) => <span className="block max-w-44 truncate text-sm text-muted-foreground">{row.original.subject}</span>,
    },
    {
      accessorKey: "createdAtISO",
      header: "تاریخ",
      cell: ({ row }) => <span className="whitespace-nowrap text-xs text-muted-foreground">{faDateTimeShort(row.original.createdAtISO)}</span>,
    },
  ];

  /* --------------------------------- render --------------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="نوبت‌ها و مشاوره‌ها"
        description={`${faNum(panel.appointments.length)} نوبت و ${faNum(panel.consultations.length)} مشاوره آنلاین ثبت‌شده`}
        loading={loading}
      />

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">نوبت‌ها</TabsTrigger>
          <TabsTrigger value="consultations">مشاوره‌های آنلاین</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="mt-4">
          <DataTable
            columns={apptColumns}
            data={filteredAppointments}
            loading={loading}
            searchable={false}
            emptyTitle="نوبتی یافت نشد"
            emptyDescription="فیلترها را تغییر دهید."
            emptyIcon={CalendarDays}
            onRowClick={(a) => setApptDetailId(a.id)}
            exportCsvName="نوبت-ها"
            csvRows={(a) => ({
              "کد": toFa(a.code),
              "بیمار": patientName(a),
              "پزشک": panel.doctorMap.get(a.doctorId)?.name ?? "",
              "تاریخ": faDateMedium(a.date),
              "ساعت": faTime(a.time),
              "نوع": VISIT_TYPE_LABELS[a.visitType],
              "وضعیت": APPOINTMENT_STATUS_LABELS[a.status],
              "پرداخت": PAYMENT_STATUS_LABELS[a.paymentStatus],
              "مبلغ (تومان)": a.fee,
            })}
            toolbar={
              <div className="flex w-full flex-wrap items-center gap-2">
                <Input
                  value={apptSearch}
                  onChange={(e) => setApptSearch(e.target.value)}
                  placeholder="جستجوی کد، بیمار یا پزشک…"
                  className="h-9 min-w-44 flex-1 text-sm sm:max-w-56"
                  aria-label="جستجوی نوبت"
                />
                <Select value={apptStatus} onValueChange={(v) => setApptStatus(v as ApptStatusFilter)}>
                  <SelectTrigger className="h-9 w-40" aria-label="فیلتر وضعیت">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>همه وضعیت‌ها</SelectItem>
                    {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={visitType} onValueChange={(v) => setVisitType(v as VisitTypeFilter)}>
                  <SelectTrigger className="h-9 w-32" aria-label="فیلتر نوع ویزیت">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>همه انواع</SelectItem>
                    {Object.entries(VISIT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1.5">
                  <JalaliDatePicker
                    value={fromISO}
                    onChange={setFromISO}
                    placeholder="از تاریخ"
                    className="h-9 w-36 text-xs"
                    aria-label="فیلتر از تاریخ"
                  />
                  <JalaliDatePicker
                    value={toISO}
                    onChange={setToISO}
                    placeholder="تا تاریخ"
                    className="h-9 w-36 text-xs"
                    aria-label="فیلتر تا تاریخ"
                  />
                </div>
                {(apptStatus !== ALL || visitType !== ALL || fromISO || toISO || apptSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setApptStatus(ALL);
                      setVisitType(ALL);
                      setFromISO(undefined);
                      setToISO(undefined);
                      setApptSearch("");
                    }}
                  >
                    پاک‌کردن فیلترها
                  </Button>
                )}
              </div>
            }
            mobileCard={(a) => (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{patientName(a)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {panel.doctorMap.get(a.doctorId)?.name ?? "—"}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(a.code)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                  <StatusBadge status={a.paymentStatus} label={PAYMENT_STATUS_LABELS[a.paymentStatus]} />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="tabular-nums">
                    {faDateShort(a.date)} · {faTime(a.time)}
                  </span>
                  <span className="tabular-nums">{toman(a.fee)}</span>
                </div>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="consultations" className="mt-4">
          <DataTable
            columns={consultColumns}
            data={filteredConsultations}
            loading={loading}
            searchable={false}
            emptyTitle="مشاوره‌ای یافت نشد"
            emptyDescription="فیلترها را تغییر دهید."
            emptyIcon={MessageSquareText}
            onRowClick={(c) => setConsultDetailId(c.id)}
            exportCsvName="مشاوره-ها"
            csvRows={(c) => ({
              "کد": toFa(c.code),
              "بیمار": panel.patientMap.get(c.patientId)?.name ?? "",
              "پزشک": panel.doctorMap.get(c.doctorId)?.name ?? "",
              "نوع": VISIT_TYPE_LABELS[c.type],
              "وضعیت": CONSULTATION_STATUS_LABELS[c.status],
              "موضوع": c.subject,
              "تاریخ": faDateTimeShort(c.createdAtISO),
              "مبلغ (تومان)": c.fee,
            })}
            toolbar={
              <div className="flex w-full flex-wrap items-center gap-2">
                <Input
                  value={consultSearch}
                  onChange={(e) => setConsultSearch(e.target.value)}
                  placeholder="جستجوی کد، موضوع یا افراد…"
                  className="h-9 min-w-44 flex-1 text-sm sm:max-w-56"
                  aria-label="جستجوی مشاوره"
                />
                <Select value={consultStatus} onValueChange={(v) => setConsultStatus(v as ConsultStatusFilter)}>
                  <SelectTrigger className="h-9 w-44" aria-label="فیلتر وضعیت مشاوره">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>همه وضعیت‌ها</SelectItem>
                    {Object.entries(CONSULTATION_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(consultStatus !== ALL || consultSearch) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => {
                      setConsultStatus(ALL);
                      setConsultSearch("");
                    }}
                  >
                    پاک‌کردن فیلترها
                  </Button>
                )}
              </div>
            }
            mobileCard={(c) => (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.subject}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {panel.patientMap.get(c.patientId)?.name ?? "بیمار"} → {panel.doctorMap.get(c.doctorId)?.name ?? "—"}
                    </p>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(c.code)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={c.status} label={CONSULTATION_STATUS_LABELS[c.status]} />
                  <span>{faDateTimeShort(c.createdAtISO)}</span>
                </div>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* appointment detail sheet */}
      <Sheet open={apptDetail !== null} onOpenChange={(v) => !v && setApptDetailId(null)}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2">
              <Stethoscope className="size-5 text-primary" aria-hidden />
              نوبت {apptDetail ? toFa(apptDetail.code) : ""}
            </SheetTitle>
            <SheetDescription>جزئیات نوبت و اقدامات مدیریتی</SheetDescription>
          </SheetHeader>
          {apptDetail && (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <dl className="space-y-2 text-sm">
                  <Row label="بیمار" value={patientName(apptDetail)} />
                  {apptDetail.forFamilyMember && (
                    <Row label="نوبت برای" value={`${apptDetail.forFamilyMember.name} (${apptDetail.forFamilyMember.relation})`} />
                  )}
                  <Row label="پزشک" value={panel.doctorMap.get(apptDetail.doctorId)?.name ?? "—"} />
                  <Row label="زمان" value={`${faDateMedium(apptDetail.date)} — ساعت ${faTime(apptDetail.time)}`} />
                  <Row label="نوع ویزیت" value={VISIT_TYPE_LABELS[apptDetail.visitType]} />
                  <Row label="مبلغ" value={toman(apptDetail.fee)} />
                  <Row label="کمیسیون پلتفرم" value={toman(apptDetail.commission)} />
                  <Row label="ثبت‌شده" value={faDateTimeShort(apptDetail.createdAtISO)} />
                </dl>

                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={apptDetail.status} label={APPOINTMENT_STATUS_LABELS[apptDetail.status]} />
                  <StatusBadge status={apptDetail.paymentStatus} label={PAYMENT_STATUS_LABELS[apptDetail.paymentStatus]} />
                </div>

                {apptDetail.reason && (
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">علت مراجعه</p>
                    <p className="mt-1 leading-6">{apptDetail.reason}</p>
                  </div>
                )}
                {apptDetail.notes && (
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">یادداشت پزشک</p>
                    <p className="mt-1 leading-6">{apptDetail.notes}</p>
                  </div>
                )}
                {apptDetail.prescription && (
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">نسخه</p>
                    <p className="mt-1 leading-6">{apptDetail.prescription}</p>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">تغییر وضعیت نوبت</p>
                    <Select
                      value={apptDetail.status}
                      onValueChange={(v) => {
                        const next = v as AppointmentStatus;
                        if (next === "cancelled") setCancelConfirm(apptDetail);
                        else changeStatus(apptDetail, next);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-label="انتخاب وضعیت جدید نوبت">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {apptDetail.paymentStatus === "unpaid" && (
                    <Button className="w-full" onClick={() => markPaid(apptDetail)}>
                      ثبت پرداخت ({toman(apptDetail.fee)})
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {/* cancel confirm */}
      <AlertDialog open={cancelConfirm !== null} onOpenChange={(v) => !v && setCancelConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو نوبت</AlertDialogTitle>
            <AlertDialogDescription>
              نوبت {cancelConfirm ? toFa(cancelConfirm.code) : ""} لغو شود؟
              {cancelConfirm?.paymentStatus === "paid" &&
                " این نوبت پرداخت‌شده است و مبلغ آن به‌صورت خودکار به کیف پول کاربر بازگشت داده می‌شود."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                if (cancelConfirm) changeStatus(cancelConfirm, "cancelled");
                setCancelConfirm(null);
              }}
            >
              بله، لغو شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* consultation detail sheet */}
      <Sheet open={consultDetail !== null} onOpenChange={(v) => !v && setConsultDetailId(null)}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-primary" aria-hidden />
              مشاوره {consultDetail ? toFa(consultDetail.code) : ""}
            </SheetTitle>
            <SheetDescription>
              {consultDetail ? consultDetail.subject : ""} — مکالمه فقط‌خواندنی
            </SheetDescription>
          </SheetHeader>
          {consultDetail && (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="space-y-4 p-4">
                <dl className="space-y-2 text-sm">
                  <Row label="بیمار" value={panel.patientMap.get(consultDetail.patientId)?.name ?? "بیمار"} />
                  <Row label="پزشک" value={panel.doctorMap.get(consultDetail.doctorId)?.name ?? "—"} />
                  <Row label="نوع" value={VISIT_TYPE_LABELS[consultDetail.type]} />
                  <Row label="مبلغ" value={toman(consultDetail.fee)} />
                  <Row label="ثبت‌شده" value={faDateTimeShort(consultDetail.createdAtISO)} />
                </dl>

                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={consultDetail.status} label={CONSULTATION_STATUS_LABELS[consultDetail.status]} />
                  <StatusBadge
                    status={consultDetail.paymentStatus}
                    label={PAYMENT_STATUS_LABELS[consultDetail.paymentStatus]}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-semibold text-muted-foreground">پرسش بیمار</p>
                    <p className="mt-1 leading-6">{consultDetail.question}</p>
                  </div>
                  {consultDetail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3 text-sm ${m.sender === "doctor" ? "border-primary/25 bg-primary/5" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold">
                          {m.sender === "doctor"
                            ? panel.doctorMap.get(consultDetail.doctorId)?.name ?? "پزشک"
                            : panel.patientMap.get(consultDetail.patientId)?.name ?? "بیمار"}
                        </p>
                        <span className="text-[11px] text-muted-foreground">{faDateTimeShort(m.sentAtISO)}</span>
                      </div>
                      <p className="mt-1.5 leading-6">{m.text}</p>
                      {m.attachments.length > 0 && (
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Paperclip className="size-3" aria-hidden />
                          {toFa(m.attachments.length)} پیوست
                        </p>
                      )}
                    </div>
                  ))}
                  {consultDetail.prescriptionNote && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">نسخه/توصیه پزشک</p>
                      <p className="mt-1 leading-6">{consultDetail.prescriptionNote}</p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">تغییر وضعیت مشاوره</p>
                  <Select
                    value={consultDetail.status}
                    onValueChange={(v) => changeConsultStatus(consultDetail, v as ConsultationStatus)}
                  >
                    <SelectTrigger className="w-full" aria-label="انتخاب وضعیت جدید مشاوره">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONSULTATION_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-end">{value}</dd>
    </div>
  );
}
