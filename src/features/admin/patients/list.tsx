"use client";

/**
 * /admin/patients — مدیریت کاربران: فهرست بیماران با فیلتر جستجو/شهر/وضعیت،
 * شیت جزئیات هر کاربر (آمار سریع + آخرین نوبت‌ها) و مسدودسازی/رفع مسدودی.
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Ban, ShieldCheck, Search, Users, UserRoundSearch } from "lucide-react";
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
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { APPOINTMENT_STATUS_LABELS, CITIES } from "@/lib/constants";
import { faDateMedium, faDateShort } from "@/lib/jalali";
import { faNum, faPhone, toFa, toman, tomanCompact } from "@/lib/fa";
import { useAdminPanel } from "@/features/admin/shared";
import type { Patient } from "@/types";

const ALL = "all";
type StatusFilter = "all" | "active" | "blocked";

export function AdminPatientsList() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const blockPatient = useAppStore((s) => s.blockPatient);

  const [search, setSearch] = useState("");
  const [city, setCity] = useState<string>(ALL);
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [detail, setDetail] = useState<Patient | null>(null);
  const [blockConfirm, setBlockConfirm] = useState<Patient | null>(null);

  /** مجموع پرداخت موفق هر کاربر (واریز به پلتفرم) */
  const paidByPatient = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of panel.transactions) {
      if (t.status !== "success" || t.direction !== "in" || !t.patientId) continue;
      m.set(t.patientId, (m.get(t.patientId) ?? 0) + t.amount);
    }
    return m;
  }, [panel.transactions]);

  const appointmentCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of panel.appointments) m.set(a.patientId, (m.get(a.patientId) ?? 0) + 1);
    return m;
  }, [panel.appointments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return panel.patients.filter((p) => {
      if (city !== ALL && p.city !== city) return false;
      if (status === "active" && p.blocked) return false;
      if (status === "blocked" && !p.blocked) return false;
      if (q) {
        const haystack = `${p.name} ${toFa(p.phone)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [panel.patients, city, status, search]);

  const columns: ColumnDef<Patient>[] = [
    {
      accessorKey: "name",
      header: "کاربر",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserAvatar name={row.original.name} hue={row.original.avatarHue} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.name}</p>
            <p className="truncate text-[11px] text-muted-foreground tabular-nums">{faPhone(row.original.phone)}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "city",
      header: "شهر",
      cell: ({ row }) => <span className="text-sm">{row.original.city}</span>,
    },
    {
      accessorKey: "insurance",
      header: "بیمه",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.insurance}</span>,
    },
    {
      id: "appointments",
      header: "نوبت‌ها",
      cell: ({ row }) => <span className="text-sm tabular-nums">{faNum(appointmentCount.get(row.original.id) ?? 0)}</span>,
    },
    {
      id: "paid",
      header: "مجموع پرداخت",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{tomanCompact(paidByPatient.get(row.original.id) ?? 0)}</span>
      ),
    },
    {
      accessorKey: "blocked",
      header: "وضعیت",
      cell: ({ row }) =>
        row.original.blocked ? (
          <Badge variant="destructive">مسدود</Badge>
        ) : (
          <StatusBadge status="active" label="فعال" />
        ),
    },
    {
      accessorKey: "birthDateISO",
      header: "تاریخ تولد",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{faDateShort(row.original.birthDateISO)}</span>,
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setDetail(row.original);
          }}
        >
          جزئیات
        </Button>
      ),
    },
  ];

  const toggleBlock = (p: Patient) => {
    const next = !p.blocked;
    blockPatient(p.id, next, panel.actorName);
    if (next) {
      toast(`${p.name} مسدود شد`, { description: "دسترسی این کاربر به سرویس‌ها قطع می‌شود." });
    } else {
      toast.success(`مسدودی ${p.name} برداشته شد`);
    }
    setBlockConfirm(null);
    setDetail((cur) => (cur && cur.id === p.id ? { ...cur, blocked: next } : cur));
  };

  const detailAppointments = useMemo(() => {
    if (!detail) return [];
    return panel.appointments
      .filter((a) => a.patientId === detail.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [detail, panel.appointments]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت کاربران"
        description={`${faNum(panel.patients.length)} کاربر ثبت‌شده — ${faNum(panel.patients.filter((p) => p.blocked).length)} حساب مسدود`}
        loading={loading}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchable={false}
        emptyTitle="کاربری یافت نشد"
        emptyDescription="فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید."
        emptyIcon={Users}
        onRowClick={(p) => setDetail(p)}
        exportCsvName="کاربران"
        csvRows={(p) => ({
          "نام": p.name,
          "موبایل": toFa(p.phone),
          "شهر": p.city,
          "بیمه": p.insurance,
          "نوبت‌ها": appointmentCount.get(p.id) ?? 0,
          "مجموع پرداخت (تومان)": paidByPatient.get(p.id) ?? 0,
          "وضعیت": p.blocked ? "مسدود" : "فعال",
          "تاریخ تولد": faDateShort(p.birthDateISO),
        })}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="relative min-w-44 flex-1 sm:max-w-60">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نام یا موبایل…"
                className="h-9 ps-8 text-sm"
                aria-label="جستجوی کاربر"
              />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-9 w-32" aria-label="فیلتر شهر">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه شهرها</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="h-9 w-32" aria-label="فیلتر وضعیت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="blocked">مسدود</SelectItem>
              </SelectContent>
            </Select>
            {(city !== ALL || status !== ALL || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  setCity(ALL);
                  setStatus(ALL);
                  setSearch("");
                }}
              >
                پاک‌کردن فیلترها
              </Button>
            )}
          </div>
        }
        mobileCard={(p) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserAvatar name={p.name} hue={p.avatarHue} size="sm" />
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{faPhone(p.phone)}</p>
                </div>
              </div>
              {p.blocked ? <Badge variant="destructive">مسدود</Badge> : <StatusBadge status="active" label="فعال" />}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {p.city} · {p.insurance}
              </span>
              <span className="tabular-nums">
                {faNum(appointmentCount.get(p.id) ?? 0)} نوبت · {tomanCompact(paidByPatient.get(p.id) ?? 0)}
              </span>
            </div>
          </div>
        )}
      />

      {/* detail sheet */}
      <Sheet open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-3">
              {detail && <UserAvatar name={detail.name} hue={detail.avatarHue} size="lg" />}
              <div className="min-w-0">
                <p className="truncate">{detail?.name ?? "…"}</p>
                {detail && (
                  <p className="mt-1 text-xs font-normal text-muted-foreground tabular-nums">{faPhone(detail.phone)}</p>
                )}
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">جزئیات حساب کاربر</SheetDescription>
          </SheetHeader>
          {detail && (
            <>
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStat title="نوبت‌ها" value={faNum(appointmentCount.get(detail.id) ?? 0)} />
                    <MiniStat title="مجموع پرداخت" value={tomanCompact(paidByPatient.get(detail.id) ?? 0)} />
                    <MiniStat title="اعضای خانواده" value={faNum(detail.family.length)} />
                    <MiniStat title="موجودی کیف پول" value={tomanCompact(detail.walletBalance)} />
                  </div>

                  <Separator />

                  <dl className="space-y-2 text-sm">
                    <InfoRow label="شماره ملی" value={toFa(detail.nationalId)} />
                    <InfoRow label="شهر" value={detail.city} />
                    <InfoRow label="آدرس" value={detail.address} />
                    <InfoRow label="بیمه" value={detail.insurance} />
                    <InfoRow label="گروه خونی" value={toFa(detail.bloodType)} />
                    <InfoRow label="تاریخ تولد" value={faDateMedium(detail.birthDateISO)} />
                    <InfoRow label="تاریخ عضویت" value={faDateMedium(detail.createdAtISO.split("T")[0])} />
                    <InfoRow
                      label="وضعیت"
                      value={detail.blocked ? "مسدود" : "فعال"}
                      badge={detail.blocked ? "destructive" : undefined}
                    />
                    {detail.allergies.length > 0 && <InfoRow label="حساسیت‌ها" value={detail.allergies.join("، ")} />}
                    {detail.chronicConditions.length > 0 && (
                      <InfoRow label="بیماری‌های زمینه‌ای" value={detail.chronicConditions.join("، ")} />
                    )}
                  </dl>

                  <Separator />

                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <UserRoundSearch className="size-4 text-primary" aria-hidden />
                      آخرین نوبت‌ها
                    </p>
                    {detailAppointments.length ? (
                      <ul className="space-y-2">
                        {detailAppointments.map((a) => (
                          <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl border p-2.5 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{panel.doctorMap.get(a.doctorId)?.name ?? "پزشک"}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {faDateShort(a.date)} — {toFa(a.code)}
                              </p>
                            </div>
                            <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} withDot={false} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                        این کاربر هنوز نوبتی ثبت نکرده است.
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>

              <div className="border-t p-4">
                {detail.blocked ? (
                  <Button className="w-full" onClick={() => setBlockConfirm(detail)}>
                    <ShieldCheck className="size-4" aria-hidden />
                    رفع مسدودی حساب
                  </Button>
                ) : (
                  <Button variant="destructive" className="w-full" onClick={() => setBlockConfirm(detail)}>
                    <Ban className="size-4" aria-hidden />
                    مسدود کردن حساب
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* block confirm */}
      <AlertDialog open={blockConfirm !== null} onOpenChange={(v) => !v && setBlockConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockConfirm?.blocked ? "رفع مسدودی حساب" : "مسدود کردن حساب"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockConfirm?.blocked
                ? `دسترسی ${blockConfirm?.name ?? ""} به سرویس‌ها بازگردانده شود؟`
                : `حساب ${blockConfirm?.name ?? ""} مسدود شود؟ امکان ورود و رزرو نوبت برای این کاربر قطع می‌شود.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className={blockConfirm?.blocked ? undefined : "bg-rose-600 text-white hover:bg-rose-700"}
              onClick={() => blockConfirm && toggleBlock(blockConfirm)}
            >
              {blockConfirm?.blocked ? "بله، رفع مسدودی" : "بله، مسدود شود"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: "destructive";
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-end">
        {badge === "destructive" ? (
          <Badge variant="destructive">{value}</Badge>
        ) : (
          <span className="tabular-nums">{value}</span>
        )}
      </dd>
    </div>
  );
}
