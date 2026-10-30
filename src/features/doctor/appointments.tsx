"use client";

/**
 * /doctor/appointments — all appointments of the logged-in doctor in a
 * TanStack table with status/type filters, Jalali date range, CSV export,
 * mobile card fallback and the shared detail sheet.
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import {
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  VISIT_TYPE_LABELS,
  type AppointmentStatus,
  type VisitType,
} from "@/lib/constants";
import { faDateNumeric, faDateShort, faTime } from "@/lib/jalali";
import { toFa, toman } from "@/lib/fa";
import { appointmentPatientName, byDateTimeDesc, useDoctorPanel, VISIT_TYPE_ICONS } from "@/features/doctor/shared";
import { AppointmentSheet } from "@/features/doctor/appointment-sheet";
import type { Appointment } from "@/types";

type StatusFilter = "all" | AppointmentStatus;
type TypeFilter = "all" | VisitType;

export function AppointmentsContent() {
  const loading = useDemoLoading();
  const { appointments, patientMap } = useDoctorPanel();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    return appointments
      .filter(
        (a) =>
          (statusFilter === "all" || a.status === statusFilter) &&
          (typeFilter === "all" || a.visitType === typeFilter) &&
          (!fromDate || a.date >= fromDate) &&
          (!toDate || a.date <= toDate)
      )
      .sort(byDateTimeDesc);
  }, [appointments, statusFilter, typeFilter, fromDate, toDate]);

  const hasFilters = statusFilter !== "all" || typeFilter !== "all" || !!fromDate || !!toDate;

  const resetFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
  };

  const columns: ColumnDef<Appointment>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{toFa(row.original.code)}</span>,
    },
    {
      id: "patient",
      accessorFn: (a) => appointmentPatientName(a, patientMap),
      header: "بیمار",
      cell: ({ row }) => <span className="font-medium">{appointmentPatientName(row.original, patientMap)}</span>,
    },
    {
      accessorKey: "date",
      header: "تاریخ",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{faDateShort(row.original.date)}</span>,
    },
    {
      accessorKey: "time",
      header: "ساعت",
      cell: ({ row }) => <span className="tabular-nums">{faTime(row.original.time)}</span>,
    },
    {
      accessorKey: "visitType",
      header: "نوع",
      cell: ({ row }) => {
        const Icon = VISIT_TYPE_ICONS[row.original.visitType];
        return (
          <span className="flex items-center gap-1.5 text-xs">
            <Icon className="size-3.5 text-primary" aria-hidden />
            {VISIT_TYPE_LABELS[row.original.visitType]}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={APPOINTMENT_STATUS_LABELS[row.original.status]} />,
    },
    {
      accessorKey: "paymentStatus",
      header: "پرداخت",
      cell: ({ row }) => (
        <StatusBadge status={row.original.paymentStatus} label={PAYMENT_STATUS_LABELS[row.original.paymentStatus]} withDot={false} />
      ),
    },
    {
      accessorKey: "fee",
      header: "مبلغ",
      cell: ({ row }) => <span className="tabular-nums text-xs">{toman(row.original.fee)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="نوبت‌ها"
        description={`${toFa(filtered.length)} نوبت از مجموع ${toFa(appointments.length)} نوبت شما`}
        loading={loading}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchPlaceholder="جستجو در کد، بیمار، دلیل…"
        emptyTitle="نوبتی یافت نشد"
        emptyDescription="فیلترها را تغییر دهید یا بازنشانی کنید."
        onRowClick={(a) => {
          setSheetId(a.id);
          setSheetOpen(true);
        }}
        exportCsvName="نوبت-ها"
        csvRows={(a) => ({
          "کد": toFa(a.code),
          "بیمار": appointmentPatientName(a, patientMap),
          "تاریخ": faDateNumeric(a.date),
          "ساعت": faTime(a.time),
          "نوع": VISIT_TYPE_LABELS[a.visitType],
          "وضعیت": APPOINTMENT_STATUS_LABELS[a.status],
          "پرداخت": PAYMENT_STATUS_LABELS[a.paymentStatus],
          "مبلغ (تومان)": a.fee,
          "دلیل مراجعه": a.reason,
        })}
        toolbar={
          <>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-9 w-36 text-xs" aria-label="فیلتر وضعیت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {APPOINTMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
              <SelectTrigger className="h-9 w-32 text-xs" aria-label="فیلتر نوع ویزیت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه انواع</SelectItem>
                {(Object.keys(VISIT_TYPE_LABELS) as VisitType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {VISIT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-40">
              <JalaliDatePicker value={fromDate} onChange={setFromDate} placeholder="از تاریخ" aria-label="از تاریخ" />
            </div>
            <div className="w-40">
              <JalaliDatePicker value={toDate} onChange={setToDate} placeholder="تا تاریخ" aria-label="تا تاریخ" />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={resetFilters}>
                <RotateCcw className="size-3.5" aria-hidden />
                بازنشانی فیلترها
              </Button>
            )}
          </>
        }
        mobileCard={(a) => (
          <div className="space-y-2 rounded-xl border p-3 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(a.code)}</span>
              <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
            </div>
            <p className="text-sm font-semibold">{appointmentPatientName(a, patientMap)}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>{faDateShort(a.date)}</span>
              <span className="tabular-nums">{faTime(a.time)}</span>
              <span>{VISIT_TYPE_LABELS[a.visitType]}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs tabular-nums">{toman(a.fee)}</span>
              <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
            </div>
          </div>
        )}
      />

      <AppointmentSheet appointmentId={sheetId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
