"use client";

/**
 * /doctors — فهرست عمومی پزشکان با جستجو و فیلتر (تخصص، شهر، نوع ویزیت، مرتب‌سازی).
 * فیلترها از query string خوانده می‌شوند (لینک از صفحه اصلی).
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarClock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  SearchX,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoLoading, useStoreHydrated } from "@/components/shared/hydration-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { useAppStore } from "@/store/app-store";
import { toman } from "@/lib/fa";
import { nextAvailableDate } from "@/lib/schedule";
import { CITIES, SPECIALTIES, SPECIALTY_LABELS } from "@/lib/constants";
import type { Doctor } from "@/types";

const ALL = "__all__";

const SORTS = [
  { key: "rating", label: "بیشترین امتیاز" },
  { key: "experience", label: "بیشترین تجربه" },
  { key: "fee-asc", label: "ارزان‌ترین ویزیت" },
  { key: "fee-desc", label: "گران‌ترین ویزیت" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function DoctorsBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const loading = useDemoLoading();
  const doctors = useAppStore((s) => s.doctors);
  const appointments = useAppStore((s) => s.appointments);

  const [query, setQuery] = useState("");
  // مقدار اولیه فیلترها از query string (لینک ورودی از صفحه اصلی)
  const [specialty, setSpecialty] = useState(() => params.get("specialty") ?? ALL);
  const [city, setCity] = useState(() => params.get("city") ?? ALL);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("rating");

  const activeDoctors = useMemo(
    () => doctors.filter((d) => d.accountStatus === "active" && d.verification === "verified"),
    [doctors],
  );

  const results = useMemo(() => {
    const q = query.trim();
    const filtered = activeDoctors.filter((d) => {
      if (specialty !== ALL && d.specialtyId !== specialty) return false;
      if (city !== ALL && d.city !== city) return false;
      if (onlineOnly && !d.availableOnline) return false;
      if (q && !`${d.name} ${SPECIALTY_LABELS[d.specialtyId]} ${d.city}`.includes(q)) return false;
      return true;
    });
    const sorted = [...filtered];
    switch (sort) {
      case "rating":
        sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case "experience":
        sorted.sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      case "fee-asc":
        sorted.sort((a, b) => a.visitFee - b.visitFee);
        break;
      case "fee-desc":
        sorted.sort((a, b) => b.visitFee - a.visitFee);
        break;
    }
    return sorted;
  }, [activeDoctors, specialty, city, onlineOnly, query, sort]);

  const nextAvailMap = useMemo(() => {
    const map = new Map<string, { dateISO: string } | null>();
    for (const d of results.slice(0, 24)) {
      const next = nextAvailableDate(d, appointments, 21);
      map.set(d.id, next ? { dateISO: next.dateISO } : null);
    }
    return map;
  }, [results, appointments]);

  const hasFilters = specialty !== ALL || city !== ALL || onlineOnly || query.trim() !== "";

  const resetFilters = () => {
    setQuery("");
    setSpecialty(ALL);
    setCity(ALL);
    setOnlineOnly(false);
    router.replace("/doctors");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold">جستجوی پزشک</h1>
        <p className="mt-2 text-muted-foreground">
          از میان پزشکان تأییدشده، متخصص مناسب خود را پیدا کنید
        </p>
      </div>

      {/* filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search
              className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="نام پزشک، تخصص یا شهر…"
              className="ps-9"
              aria-label="جستجوی پزشک"
            />
          </div>
          <Select value={specialty} onValueChange={setSpecialty}>
            <SelectTrigger className="md:w-48" aria-label="فیلتر تخصص">
              <SelectValue placeholder="همه تخصص‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه تخصص‌ها</SelectItem>
              {SPECIALTIES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="md:w-40" aria-label="فیلتر شهر">
              <SelectValue placeholder="همه شهرها" />
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
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="md:w-44" aria-label="مرتب‌سازی">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* online-only toggle + result count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground" role="status">
          {loading || !hydrated ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <>
              <span className="font-bold text-foreground">{results.length.toLocaleString("fa-IR")}</span>{" "}
              پزشک یافت شد
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={onlineOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setOnlineOnly((v) => !v)}
            aria-pressed={onlineOnly}
          >
            <Video className="size-4" aria-hidden />
            فقط مشاوره آنلاین
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              حذف فیلترها
            </Button>
          )}
        </div>
      </div>

      {/* grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading || !hydrated
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))
          : results.map((doctor) => (
              <DoctorResultCard
                key={doctor.id}
                doctor={doctor}
                nextAvail={nextAvailMap.get(doctor.id) ?? null}
              />
            ))}
      </div>

      {!loading && hydrated && results.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="پزشکی با این مشخصات یافت نشد"
          description="فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید."
          action={
            <Button variant="outline" size="sm" onClick={resetFilters}>
              حذف فیلترها
            </Button>
          }
        />
      )}
    </div>
  );
}

function DoctorResultCard({ doctor, nextAvail }: { doctor: Doctor; nextAvail: { dateISO: string } | null }) {
  return (
    <Link href={`/doctors/${doctor.id}`} className="group">
      <Card className="h-full transition-all group-hover:-translate-y-1 group-hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start gap-3">
            <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold group-hover:text-primary">{doctor.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {SPECIALTY_LABELS[doctor.specialtyId]}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <MapPin className="size-3" aria-hidden />
                  {doctor.city}
                </Badge>
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <BadgeCheck className="size-3 text-emerald-600" aria-hidden />
                  {doctor.experienceYears.toLocaleString("fa-IR")} سال تجربه
                </Badge>
              </div>
            </div>
          </div>

          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{doctor.bio}</p>

          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
              <Phone className="size-3" aria-hidden />
              تلفنی
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
              <MessageCircle className="size-3" aria-hidden />
              متنی
            </span>
            {doctor.availableOnline && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1">
                <Video className="size-3" aria-hidden />
                ویدیویی
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t pt-3">
            <RatingStars value={doctor.rating} count={doctor.reviewCount} size={14} />
            <div className="text-end">
              <p className="text-sm font-bold text-primary">{toman(doctor.visitFee)}</p>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarClock className="size-3" aria-hidden />
                {nextAvail ? "نوبت خالی دارد" : "به‌زودی"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto my-10 h-96 max-w-6xl rounded-2xl" />}>
      <DoctorsBrowser />
    </Suspense>
  );
}
