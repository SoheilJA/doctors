"use client";

/**
 * پیدا کردن پزشک — فیلترهای جستجو، مرتب‌سازی و شبکه کارت پزشکان.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FilterX, Search, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { faNum } from "@/lib/fa";
import { nextAvailableDate, type GeneratedSlot } from "@/lib/schedule";
import {
  CITIES,
  INSURERS,
  SPECIALTY_LABELS,
  VISIT_TYPE_LABELS,
  type VisitType,
} from "@/lib/constants";
import { DoctorCard } from "@/features/patient/doctor-card";
import { useCurrentPatient } from "@/features/patient/helpers";
import type { Appointment } from "@/types";

const SORTS = [
  { id: "rating", label: "امتیاز بالاتر" },
  { id: "fee", label: "قیمت کمتر" },
  { id: "experience", label: "سابقه بیشتر" },
  { id: "soonest", label: "نزدیک‌ترین نوبت" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

export default function FindDoctorPage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const doctors = useAppStore((s) => s.doctors);
  const specialties = useAppStore((s) => s.specialties);
  const appointments = useAppStore((s) => s.appointments);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const [specialty, setSpecialty] = useState<string>("all");
  const [city, setCity] = useState<string>("all");
  const [gender, setGender] = useState<string>("all");
  const [visitType, setVisitType] = useState<string>("all");
  const [insurer, setInsurer] = useState<string>("all");
  const [soonOnly, setSoonOnly] = useState(false);
  const [feeMin, setFeeMin] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const [sort, setSort] = useState<SortId>("rating");


  /** نزدیک‌ترین نوبت آزاد هر پزشک (افق ۱۴ روز) — فقط نوبت‌های همان پزشک بررسی می‌شود. */
  const nextAvailMap = useMemo(() => {
    const map = new Map<string, { dateISO: string; slot: GeneratedSlot } | null>();
    const byDoctor = new Map<string, Appointment[]>();
    for (const appt of appointments) {
      const list = byDoctor.get(appt.doctorId);
      if (list) list.push(appt);
      else byDoctor.set(appt.doctorId, [appt]);
    }
    for (const doc of doctors) {
      if (doc.accountStatus !== "active") continue;
      map.set(doc.id, nextAvailableDate(doc, byDoctor.get(doc.id) ?? [], 14));
    }
    return map;
  }, [doctors, appointments]);

  const activeDoctors = useMemo(() => doctors.filter((d) => d.accountStatus === "active"), [doctors]);

  const filtered = useMemo(() => {
    const min = feeMin ? parse(feeMin) * 1000 : 0;
    const max = feeMax ? parse(feeMax) * 1000 : Infinity;
    const list = activeDoctors.filter((d) => {
      if (specialty !== "all" && d.specialtyId !== specialty) return false;
      if (city !== "all" && d.city !== city) return false;
      if (gender !== "all" && d.gender !== gender) return false;
      if (insurer !== "all" && !d.insurers.includes(insurer)) return false;
      if (visitType !== "all") {
        const vt = visitType as VisitType;
        if (vt === "in-person") {
          // just needs in-person working days (all doctors have in-person ranges in practice)
        } else if (!d.availableOnline) return false;
      }
      if (soonOnly && !nextAvailMap.get(d.id)) return false;
      if (min && d.visitFee < min) return false;
      if (max !== Infinity && d.visitFee > max) return false;
      return true;
    });
    switch (sort) {
      case "rating":
        return list.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      case "fee":
        return list.sort((a, b) => a.visitFee - b.visitFee);
      case "experience":
        return list.sort((a, b) => b.experienceYears - a.experienceYears);
      case "soonest":
        return list.sort((a, b) => {
          const da = nextAvailMap.get(a.id)?.dateISO ?? "9999";
          const db = nextAvailMap.get(b.id)?.dateISO ?? "9999";
          return da.localeCompare(db);
        });
      default:
        return list;
    }
  }, [activeDoctors, specialty, city, gender, insurer, visitType, soonOnly, feeMin, feeMax, sort, nextAvailMap]);

  const hasFilters =
    specialty !== "all" || city !== "all" || gender !== "all" || insurer !== "all" || visitType !== "all" || soonOnly || feeMin !== "" || feeMax !== "";

  const clearFilters = () => {
    setSpecialty("all");
    setCity("all");
    setGender("all");
    setVisitType("all");
    setInsurer("all");
    setSoonOnly(false);
    setFeeMin("");
    setFeeMax("");
  };

  const onToggleFavorite = (doctorId: string) => {
    if (!patient) return;
    const exists = favorites.some((f) => f.patientId === patient.id && f.doctorId === doctorId);
    toggleFavorite(patient.id, doctorId);
    toast.success(exists ? "از علاقه‌مندی‌ها حذف شد" : "به علاقه‌مندی‌ها اضافه شد");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="پیدا کردن پزشک"
        description={`جستجو میان ${faNum(activeDoctors.length)} پزشک فعال؛ بر اساس تخصص، شهر، نوع ویزیت و تعرفه فیلتر کنید.`}
        loading={loading}
        actions={
          <Select value={sort} onValueChange={(v) => setSort(v as SortId)}>
            <SelectTrigger className="w-40" aria-label="مرتب‌سازی">
              <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* filters toolbar */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">تخصص</Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="w-full" aria-label="انتخاب تخصص">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه تخصص‌ها</SelectItem>
                {specialties.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">شهر</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-full" aria-label="انتخاب شهر">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه شهرها</SelectItem>
                {CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">جنسیت پزشک</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full" aria-label="انتخاب جنسیت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="female">خانم</SelectItem>
                <SelectItem value="male">آقا</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">نوع ویزیت</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger className="w-full" aria-label="انتخاب نوع ویزیت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                {(Object.keys(VISIT_TYPE_LABELS) as VisitType[]).map((v) => (
                  <SelectItem key={v} value={v}>
                    {VISIT_TYPE_LABELS[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">بیمه</Label>
            <Select value={insurer} onValueChange={setInsurer}>
              <SelectTrigger className="w-full" aria-label="انتخاب بیمه">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                {INSURERS.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">تعرفه ویزیت (هزار تومان)</Label>
            <div className="flex items-center gap-1.5">
              <Input
                value={feeMin}
                onChange={(e) => setFeeMin(e.target.value)}
                inputMode="numeric"
                placeholder="از"
                aria-label="حداقل تعرفه"
                className="h-9"
              />
              <Input
                value={feeMax}
                onChange={(e) => setFeeMax(e.target.value)}
                inputMode="numeric"
                placeholder="تا"
                aria-label="حداکثر تعرفه"
                className="h-9"
              />
            </div>
          </div>
          <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2 sm:col-span-3 xl:col-span-4">
            <div className="flex items-center gap-2">
              <Switch id="soon-only" checked={soonOnly} onCheckedChange={setSoonOnly} aria-label="فقط نزدیک‌ترین نوبت" />
              <Label htmlFor="soon-only" className="cursor-pointer text-xs">
                فقط پزشکان با نوبت آزاد در ۲ هفته آینده
              </Label>
            </div>
            <p className="hidden text-xs text-muted-foreground md:block">
              آخرین روز قابل رزرو: {faNum(14)} روز آینده (تا {faNum(45)} روز در فرایند رزرو)
            </p>
          </div>
          <div className="col-span-2 flex items-end sm:col-span-3 xl:col-span-2">
            <Button variant="outline" size="sm" className="w-full" disabled={!hasFilters} onClick={clearFilters}>
              <FilterX className="size-4" aria-hidden />
              حذف فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-4" aria-hidden />
        <span>
          <b className="text-foreground">{faNum(filtered.length)}</b> پزشک یافت شد
        </span>
      </div>

      {/* grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              nextAvail={nextAvailMap.get(doc.id) ?? null}
              isFavorite={!!patient && favorites.some((f) => f.patientId === patient.id && f.doctorId === doc.id)}
              onToggleFavorite={() => onToggleFavorite(doc.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="پزشکی با این فیلترها یافت نشد"
          description="محدوده جستجو را تغییر دهید یا فیلترها را حذف کنید تا پزشکان بیشتری ببینید."
          action={
            hasFilters ? (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <FilterX className="size-4" aria-hidden />
                حذف فیلترها
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

/** parse fee input (Persian or latin digits) → number */
function parse(input: string): number {
  const normalized = input.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const n = Number(normalized.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
