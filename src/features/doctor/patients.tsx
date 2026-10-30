"use client";

/**
 * /doctor/patients — searchable table of every patient who ever booked
 * with this doctor, with a quick stats row per patient and mobile cards.
 * (The [id] detail page lives in patient-detail.tsx.)
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Users } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { UserAvatar } from "@/components/shared/user-avatar";
import { faFromNow } from "@/lib/jalali";
import { faNum, faPhone } from "@/lib/fa";
import { byDateTimeDesc, useDoctorPanel } from "@/features/doctor/shared";
import type { Patient } from "@/types";

interface PatientRow {
  patient: Patient;
  visits: number;
  lastVisitISO: string;
  lastVisitLabel: string;
}

export function PatientsContent() {
  const loading = useDemoLoading();
  const router = useRouter();
  const { appointments, patientMap } = useDoctorPanel();

  const rows = useMemo<PatientRow[]>(() => {
    const m = new Map<string, PatientRow>();
    for (const a of [...appointments].sort(byDateTimeDesc)) {
      const patient = patientMap.get(a.patientId);
      if (!patient) continue;
      const entry = m.get(a.patientId);
      if (entry) {
        entry.visits += 1;
        continue;
      }
      m.set(a.patientId, { patient, visits: 1, lastVisitISO: a.date, lastVisitLabel: "" });
    }
    return [...m.values()].map((r) => ({ ...r, lastVisitLabel: faFromNow(r.lastVisitISO) }));
  }, [appointments, patientMap]);

  const columns: ColumnDef<PatientRow>[] = [
    {
      id: "patient",
      accessorFn: (r) => r.patient.name,
      header: "بیمار",
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <UserAvatar name={row.original.patient.name} hue={row.original.patient.avatarHue} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{row.original.patient.name}</span>
            <span className="block text-[11px] text-muted-foreground">{faPhone(row.original.patient.phone)}</span>
          </span>
        </span>
      ),
    },
    {
      accessorKey: "city",
      header: "شهر",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.patient.city}</span>,
    },
    {
      accessorKey: "visits",
      header: "تعداد ویزیت",
      cell: ({ row }) => <span className="font-semibold tabular-nums">{faNum(row.original.visits)}</span>,
    },
    {
      id: "lastVisit",
      accessorFn: (r) => r.lastVisitISO,
      header: "آخرین مراجعه",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.lastVisitLabel}</span>,
    },
    {
      accessorKey: "insurance",
      header: "بیمه",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.patient.insurance}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="بیماران"
        description={`${faNum(rows.length)} بیمار تا امروز با شما نوبت گرفته‌اند`}
        loading={loading}
      />
      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        searchPlaceholder="جستجوی نام، شماره تماس، شهر…"
        emptyTitle="هنوز بیماری ثبت نشده است"
        emptyDescription="با اولین نوبت‌گیری، بیماران شما اینجا ظاهر می‌شوند."
        emptyIcon={Users}
        onRowClick={(r) => router.push(`/doctor/patients/${r.patient.id}`)}
        mobileCard={(r) => (
          <div className="space-y-2 rounded-xl border p-3 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{r.patient.name}</p>
              <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-primary">
                {faNum(r.visits)} ویزیت
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {faPhone(r.patient.phone)} • {r.patient.city}
            </p>
            <p className="text-xs text-muted-foreground">آخرین مراجعه: {r.lastVisitLabel}</p>
          </div>
        )}
      />
    </div>
  );
}
