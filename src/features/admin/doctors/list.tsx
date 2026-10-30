"use client";

/**
 * /admin/doctors — مدیریت پزشکان: فهرست با فیلترها (وضعیت احراز/حساب/تخصص/شهر + جستجو)،
 * عملیات ردیف (مشاهده جزئیات، تأیید/رد احراز، تعلیق/فعال‌سازی، ویرایش کمیسیون).
 * پارامتر `?status=pending` یک‌بار در ابتدای بارگذاری فیلتر احراز را تنظیم می‌کند.
 */

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  BadgeCheck,
  Ban,
  MoreHorizontal,
  PercentCircle,
  Search,
  ShieldCheck,
  Stethoscope,
  UserRoundSearch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  CITIES,
  DOCTOR_ACCOUNT_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  type DoctorAccountStatus,
  type VerificationStatus,
} from "@/lib/constants";
import { faNum, faPercent, toFa, toman } from "@/lib/fa";
import { specialtyTitle, faRating, useAdminPanel } from "@/features/admin/shared";
import { CommissionDialog, RejectVerificationDialog, SuspendDoctorDialog } from "@/features/admin/doctors/dialogs";
import type { Doctor } from "@/types";

const ALL = "all";
type VerificationFilter = VerificationStatus | typeof ALL;
type AccountFilter = DoctorAccountStatus | typeof ALL;

export function AdminDoctorsList() {
  const loading = useDemoLoading();
  const router = useRouter();
  const searchParams = useSearchParams();
  const panel = useAdminPanel();
  const setDoctorVerification = useAppStore((s) => s.setDoctorVerification);
  const setDoctorAccountStatus = useAppStore((s) => s.setDoctorAccountStatus);

  /* فیلتر وضعیت احراز از URL فقط یک‌بار در ابتدا خوانده می‌شود */
  const [verification, setVerification] = useState<VerificationFilter>(() => {
    const p = searchParams.get("status");
    return p === "pending" || p === "verified" || p === "rejected" ? p : ALL;
  });
  const [account, setAccount] = useState<AccountFilter>(ALL);
  const [specialty, setSpecialty] = useState<string>(ALL);
  const [city, setCity] = useState<string>(ALL);
  const [search, setSearch] = useState("");

  const [rejectDoctor, setRejectDoctor] = useState<Doctor | null>(null);
  const [commissionDoctor, setCommissionDoctor] = useState<Doctor | null>(null);
  const [suspendDoctor, setSuspendDoctor] = useState<Doctor | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return panel.doctors.filter((d) => {
      if (verification !== ALL && d.verification !== verification) return false;
      if (account !== ALL && d.accountStatus !== account) return false;
      if (specialty !== ALL && d.specialtyId !== specialty) return false;
      if (city !== ALL && d.city !== city) return false;
      if (q) {
        const haystack = `${d.name} ${d.licenseNumber}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [panel.doctors, verification, account, specialty, city, search]);

  const counts = useMemo(
    () => ({
      pending: panel.doctors.filter((d) => d.verification === "pending").length,
      suspended: panel.doctors.filter((d) => d.accountStatus === "suspended").length,
    }),
    [panel.doctors]
  );

  const verify = (d: Doctor) => {
    setDoctorVerification(d.id, "verified", panel.actorName);
    toast.success(`احراز هویت ${d.name} تأیید شد`, { description: "وضعیت حساب: فعال" });
  };

  const activate = (d: Doctor) => {
    setDoctorAccountStatus(d.id, "active", panel.actorName);
    toast.success(`حساب ${d.name} فعال شد`);
  };

  const columns: ColumnDef<Doctor>[] = [
    {
      accessorKey: "name",
      header: "پزشک",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserAvatar name={row.original.name} hue={row.original.avatarHue} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">پروانه: {toFa(row.original.licenseNumber)}</p>
          </div>
        </div>
      ),
    },
    {
      id: "specialty",
      header: "تخصص",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{specialtyTitle(row.original.specialtyId, panel.specialties)}</span>
      ),
    },
    {
      accessorKey: "city",
      header: "شهر",
      cell: ({ row }) => <span className="text-sm">{row.original.city}</span>,
    },
    {
      accessorKey: "experienceYears",
      header: "تجربه",
      cell: ({ row }) => <span className="text-sm tabular-nums">{faNum(row.original.experienceYears)} سال</span>,
    },
    {
      accessorKey: "visitFee",
      header: "تعرفه ویزیت",
      cell: ({ row }) => <span className="text-sm tabular-nums">{toman(row.original.visitFee)}</span>,
    },
    {
      id: "rating",
      header: "امتیاز",
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-sm tabular-nums">
          {faRating(row.original.rating)}
          <span className="text-amber-500" aria-hidden>
            ★
          </span>
        </span>
      ),
    },
    {
      id: "verification",
      header: "وضعیت احراز",
      cell: ({ row }) => (
        <StatusBadge status={row.original.verification} label={VERIFICATION_STATUS_LABELS[row.original.verification]} />
      ),
    },
    {
      id: "accountStatus",
      header: "وضعیت حساب",
      cell: ({ row }) => (
        <StatusBadge status={row.original.accountStatus} label={DOCTOR_ACCOUNT_STATUS_LABELS[row.original.accountStatus]} />
      ),
    },
    {
      accessorKey: "commissionRate",
      header: "کمیسیون",
      cell: ({ row }) => <span className="text-sm tabular-nums">{faPercent(row.original.commissionRate)}</span>,
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`عملیات ${d.name}`}>
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>عملیات پزشک</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/admin/doctors/${d.id}`)}>
                  <UserRoundSearch className="size-4" aria-hidden />
                  مشاهده جزئیات
                </DropdownMenuItem>
                {d.verification === "pending" && (
                  <>
                    <DropdownMenuItem onClick={() => verify(d)}>
                      <BadgeCheck className="size-4 text-emerald-500" aria-hidden />
                      تأیید احراز
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRejectDoctor(d)}>
                      <ShieldCheck className="size-4 text-rose-500" aria-hidden />
                      رد احراز
                    </DropdownMenuItem>
                  </>
                )}
                {d.accountStatus === "active" && (
                  <DropdownMenuItem onClick={() => setSuspendDoctor(d)}>
                    <Ban className="size-4 text-rose-500" aria-hidden />
                    تعلیق حساب
                  </DropdownMenuItem>
                )}
                {d.accountStatus === "suspended" && (
                  <DropdownMenuItem onClick={() => activate(d)}>
                    <BadgeCheck className="size-4 text-emerald-500" aria-hidden />
                    فعال‌سازی حساب
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCommissionDoctor(d)}>
                  <PercentCircle className="size-4" aria-hidden />
                  ویرایش کمیسیون
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت پزشکان"
        description={`${faNum(panel.doctors.length)} پزشک ثبت‌شده — ${faNum(counts.pending)} درخواست در انتظار بررسی، ${faNum(counts.suspended)} حساب تعلیق‌شده`}
        loading={loading}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchable={false}
        emptyTitle="پزشکی با این فیلترها یافت نشد"
        emptyDescription="فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید."
        emptyIcon={Stethoscope}
        exportCsvName="پزشکان"
        csvRows={(d) => ({
          "نام": d.name,
          "تخصص": specialtyTitle(d.specialtyId, panel.specialties),
          "شهر": d.city,
          "تجربه (سال)": d.experienceYears,
          "تعرفه ویزیت (تومان)": d.visitFee,
          "امتیاز": faRating(d.rating),
          "وضعیت احراز": VERIFICATION_STATUS_LABELS[d.verification],
          "وضعیت حساب": DOCTOR_ACCOUNT_STATUS_LABELS[d.accountStatus],
          "کمیسیون (٪)": d.commissionRate,
          "شماره پروانه": toFa(d.licenseNumber),
        })}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="relative min-w-44 flex-1 sm:max-w-60">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجوی نام یا شماره پروانه…"
                className="h-9 ps-8 text-sm"
                aria-label="جستجوی پزشک"
              />
            </div>
            <Select value={verification} onValueChange={(v) => setVerification(v as VerificationFilter)}>
              <SelectTrigger className="h-9 w-40" aria-label="فیلتر وضعیت احراز">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه وضعیت‌های احراز</SelectItem>
                <SelectItem value="pending">{VERIFICATION_STATUS_LABELS.pending}</SelectItem>
                <SelectItem value="verified">{VERIFICATION_STATUS_LABELS.verified}</SelectItem>
                <SelectItem value="rejected">{VERIFICATION_STATUS_LABELS.rejected}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={account} onValueChange={(v) => setAccount(v as AccountFilter)}>
              <SelectTrigger className="h-9 w-36" aria-label="فیلتر وضعیت حساب">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه وضعیت‌های حساب</SelectItem>
                <SelectItem value="active">{DOCTOR_ACCOUNT_STATUS_LABELS.active}</SelectItem>
                <SelectItem value="suspended">{DOCTOR_ACCOUNT_STATUS_LABELS.suspended}</SelectItem>
                <SelectItem value="pending">{DOCTOR_ACCOUNT_STATUS_LABELS.pending}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="h-9 w-36" aria-label="فیلتر تخصص">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه تخصص‌ها</SelectItem>
                {panel.specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-9 w-28" aria-label="فیلتر شهر">
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
            {(verification !== ALL || account !== ALL || specialty !== ALL || city !== ALL || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  setVerification(ALL);
                  setAccount(ALL);
                  setSpecialty(ALL);
                  setCity(ALL);
                  setSearch("");
                }}
              >
                پاک‌کردن فیلترها
              </Button>
            )}
          </div>
        }
        mobileCard={(d) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserAvatar name={d.name} hue={d.avatarHue} size="sm" />
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {specialtyTitle(d.specialtyId, panel.specialties)} — {d.city}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] tabular-nums">
                {faPercent(d.commissionRate)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={d.verification} label={VERIFICATION_STATUS_LABELS[d.verification]} />
              <StatusBadge status={d.accountStatus} label={DOCTOR_ACCOUNT_STATUS_LABELS[d.accountStatus]} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {toman(d.visitFee)} · {faNum(d.experienceYears)} سال · {faRating(d.rating)} ★
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.push(`/admin/doctors/${d.id}`)}>
                جزئیات
              </Button>
            </div>
          </div>
        )}
      />

      <RejectVerificationDialog
        doctor={rejectDoctor}
        open={rejectDoctor !== null}
        onOpenChange={(v) => !v && setRejectDoctor(null)}
        actorName={panel.actorName}
      />
      <CommissionDialog
        doctor={commissionDoctor}
        open={commissionDoctor !== null}
        onOpenChange={(v) => !v && setCommissionDoctor(null)}
        actorName={panel.actorName}
      />
      <SuspendDoctorDialog
        doctor={suspendDoctor}
        open={suspendDoctor !== null}
        onOpenChange={(v) => !v && setSuspendDoctor(null)}
        actorName={panel.actorName}
      />
    </div>
  );
}
