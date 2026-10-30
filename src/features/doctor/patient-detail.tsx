"use client";

/**
 * /doctor/patients/[id] — patient profile as seen by the doctor:
 * header card, visit stats, visit history table, mock record files and
 * a note bound to the latest completed visit.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  FileText,
  Image as ImageIcon,
  MapPin,
  Phone,
  Save,
  Upload,
  UserX,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { APPOINTMENT_STATUS_LABELS, VISIT_TYPE_LABELS } from "@/lib/constants";
import { faDateMedium, faFromNow, faDateShort, faTime } from "@/lib/jalali";
import { faNum, faPhone, toFa, toman } from "@/lib/fa";
import { useDoctorPanel, VISIT_TYPE_ICONS } from "@/features/doctor/shared";
import { AppointmentSheet } from "@/features/doctor/appointment-sheet";
import type { Appointment } from "@/types";

interface MockFile {
  name: string;
  sizeKB: number;
  type: "image" | "pdf";
}

const BASE_FILES: MockFile[] = [
  { name: "گزارش-آزمایش.pdf", sizeKB: 420, type: "pdf" },
  { name: "عکس-ضایعه.jpg", sizeKB: 256, type: "image" },
  { name: "نسخه-دارویی.pdf", sizeKB: 180, type: "pdf" },
];

export function PatientDetailContent() {
  const loading = useDemoLoading();
  const params = useParams<{ id: string }>();
  const patientId = params?.id;
  const { appointments } = useDoctorPanel();
  const patients = useAppStore((s) => s.patients);
  const updateAppointment = useAppStore((s) => s.updateAppointment);

  const [files, setFiles] = useState<MockFile[]>(BASE_FILES);
  const [note, setNote] = useState<string | null>(null);
  const [noteDirty, setNoteDirty] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const patient = patients.find((p) => p.id === patientId);

  const history = useMemo(
    () =>
      appointments
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [appointments, patientId]
  );

  const stats = useMemo(() => {
    const completed = history.filter((a) => a.status === "completed");
    const lastVisit = history[0];
    const totalPaid = history.filter((a) => a.paymentStatus === "paid").reduce((s, a) => s + a.fee, 0);
    return { visits: completed.length, lastVisit, totalPaid };
  }, [history]);

  const latestCompleted = useMemo(
    () => history.find((a) => a.status === "completed"),
    [history]
  );

  // initialize the note from the latest completed visit
  const effectiveNote = note ?? latestCompleted?.notes ?? "";

  const saveNote = () => {
    if (!latestCompleted) return;
    updateAppointment(latestCompleted.id, { notes: effectiveNote });
    setNoteDirty(false);
    toast.success("یادداشت آخرین ویزیت ثبت شد");
  };

  const uploadMock = () => {
    setFiles((prev) => [...prev, { name: `فایل-${prev.length + 1}.pdf`, sizeKB: 512, type: "pdf" }]);
    toast.success("فایل نمونه بارگذاری شد (شبیه‌سازی)");
  };

  const columns: ColumnDef<Appointment>[] = [
    {
      accessorKey: "date",
      header: "تاریخ",
      cell: ({ row }) => <span className="text-xs">{faDateShort(row.original.date)} — {faTime(row.original.time)}</span>,
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
      accessorKey: "fee",
      header: "مبلغ",
      cell: ({ row }) => <span className="text-xs tabular-nums">{toman(row.original.fee)}</span>,
    },
    {
      accessorKey: "reason",
      header: "دلیل مراجعه",
      cell: ({ row }) => <span className="block max-w-44 truncate text-xs text-muted-foreground">{row.original.reason || "—"}</span>,
    },
  ];

  if (!patient) {
    return (
      <div className="space-y-4">
        <PageHeader title="پرونده بیمار" loading={loading} />
        <EmptyState
          icon={UserX}
          title="بیمار یافت نشد"
          description="ممکن است این بیمار با شما نوبتی ثبت نکرده باشد."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/doctor/patients">
                <ChevronLeft className="size-4" aria-hidden />
                بازگشت به فهرست بیماران
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`پرونده ${patient.name}`}
        description={`عضو سامانه از ${faDateMedium(patient.createdAtISO)}`}
        loading={loading}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/doctor/patients">
              <ChevronLeft className="size-4" aria-hidden />
              فهرست بیماران
            </Link>
          </Button>
        }
      />

      {/* identity card */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4 md:p-6">
          <UserAvatar name={patient.name} hue={patient.avatarHue} size="xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{patient.name}</h2>
              <Badge variant="outline" className="text-xs">{patient.insurance}</Badge>
              <Badge variant="outline" className="text-xs">گروه خونی: {patient.bloodType}</Badge>
              {patient.blocked && <Badge variant="destructive" className="text-xs">حساب مسدود</Badge>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {patient.allergies.map((a) => (
                <Badge key={a} variant="outline" className="border-rose-500/40 bg-rose-500/10 text-[11px] text-rose-700 dark:text-rose-400">
                  حساسیت: {a}
                </Badge>
              ))}
              {patient.chronicConditions.map((c) => (
                <Badge key={c} variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-700 dark:text-amber-400">
                  {c}
                </Badge>
              ))}
              {patient.allergies.length === 0 && patient.chronicConditions.length === 0 && (
                <span className="text-xs text-muted-foreground">حساسیت یا بیماری زمینه‌ای ثبت نشده است.</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="size-3.5" aria-hidden />{faPhone(patient.phone)}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{patient.city}</span>
              {patient.address && <span className="max-w-72 truncate">{patient.address}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* stats */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار پرونده">
        <StatCard title="تعداد ویزیت‌ها" value={faNum(stats.visits)} hint="ویزیت‌های انجام‌شده با شما" icon={CalendarCheck} loading={loading} />
        <StatCard
          title="آخرین مراجعه"
          value={stats.lastVisit ? faFromNow(stats.lastVisit.date) : "—"}
          hint={stats.lastVisit ? faDateShort(stats.lastVisit.date) : "بدون سابقه"}
          icon={CalendarDays}
          tone="sky"
          loading={loading}
        />
        <StatCard
          title="مجموع پرداختی"
          value={toman(stats.totalPaid)}
          hint="نوبت‌های پرداخت‌شده این بیمار"
          icon={Wallet}
          tone="emerald"
          loading={loading}
        />
      </section>

      {/* visit history + files */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={history}
            loading={loading}
            searchable={false}
            pageSize={8}
            emptyTitle="سابقه نوبتی وجود ندارد"
            emptyDescription="این بیمار هنوز با شما نوبتی ثبت نکرده است."
            onRowClick={(a) => {
              setSheetId(a.id);
              setSheetOpen(true);
            }}
            mobileCard={(a) => (
              <div className="space-y-1.5 rounded-xl border p-3 transition-colors hover:border-primary/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{faDateShort(a.date)} — {faTime(a.time)}</span>
                  <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                </div>
                <p className="text-sm">{VISIT_TYPE_LABELS[a.visitType]} • {toman(a.fee)}</p>
                {a.reason && <p className="text-xs text-muted-foreground">{a.reason}</p>}
              </div>
            )}
          />
        </div>

        <div className="space-y-4">
          {/* files */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">پرونده و فایل‌ها</CardTitle>
              <CardDescription className="text-xs">فایل‌های این بیمار (نمونه نمایشی)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                {files.map((f) => (
                  <li key={f.name} className="flex items-center gap-2 rounded-xl border p-2.5 text-sm">
                    {f.type === "image" ? (
                      <ImageIcon className="size-4 text-sky-500" aria-hidden />
                    ) : (
                      <FileText className="size-4 text-rose-500" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{toFa(f.sizeKB)} کیلوبایت</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full" onClick={uploadMock}>
                <Upload className="size-4" aria-hidden />
                بارگذاری فایل
              </Button>
            </CardContent>
          </Card>

          {/* note */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">یادداشت آخرین ویزیت</CardTitle>
              <CardDescription className="text-xs">
                این یادداشت روی آخرین ویزیت انجام‌شده ({latestCompleted ? faDateShort(latestCompleted.date) : "—"}) ذخیره می‌شود.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="visit-note" className="sr-only">متن یادداشت</Label>
                <Textarea
                  id="visit-note"
                  value={effectiveNote}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setNoteDirty(true);
                  }}
                  placeholder="شرح معاینه، تشخیص و توصیه‌ها…"
                  className="min-h-28 text-sm"
                  disabled={!latestCompleted}
                />
                {!latestCompleted && (
                  <p className="text-xs text-amber-600">برای این بیمار ویزیت انجام‌شده‌ای وجود ندارد؛ ثبت یادداشت ممکن نیست.</p>
                )}
              </div>
              <Button size="sm" className="w-full" onClick={saveNote} disabled={!latestCompleted || !noteDirty}>
                <Save className="size-4" aria-hidden />
                ثبت یادداشت
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AppointmentSheet appointmentId={sheetId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
