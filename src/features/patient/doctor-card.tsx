"use client";

/**
 * DoctorCard — shared card for find-doctor grid & favorites page.
 * Parent computes nextAvailableDate (perf) and passes it as a prop.
 */

import Link from "next/link";
import { Heart, MapPin, Video, Phone, MessageCircle, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toFa, toman } from "@/lib/fa";
import { faDateShort, faFromNow, faTime } from "@/lib/jalali";
import { SPECIALTY_LABELS, VISIT_TYPE_LABELS } from "@/lib/constants";
import type { GeneratedSlot } from "@/lib/schedule";
import type { Doctor } from "@/types";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RatingStars } from "@/components/shared/rating-stars";

interface DoctorCardProps {
  doctor: Doctor;
  nextAvail: { dateISO: string; slot: GeneratedSlot } | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function DoctorCard({ doctor, nextAvail, isFavorite, onToggleFavorite }: DoctorCardProps) {
  const fees: { key: "phone" | "text" | "video"; icon: typeof Phone; fee: number }[] = [
    { key: "phone", icon: Phone, fee: doctor.phoneFee },
    { key: "text", icon: MessageCircle, fee: doctor.textFee },
    { key: "video", icon: Video, fee: doctor.videoFee },
  ];

  return (
    <Card className="group flex flex-col transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {/* identity */}
        <div className="flex items-start gap-3">
          <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{doctor.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {SPECIALTY_LABELS[doctor.specialtyId] ?? doctor.specialtyId}
                  {" • "}
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="inline size-3" aria-hidden />
                    {doctor.city}
                  </span>
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 rounded-full text-muted-foreground hover:text-rose-500"
                    aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
                    onClick={onToggleFavorite}
                  >
                    <Heart className={cn("size-4.5", isFavorite && "fill-rose-500 text-rose-500")} aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}</TooltipContent>
              </Tooltip>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <RatingStars value={doctor.rating} count={doctor.reviewCount} size={14} />
              <Badge variant="outline" className="text-[10px]">
                {toFa(doctor.experienceYears)} سال سابقه
              </Badge>
            </div>
          </div>
        </div>

        {/* fees */}
        <div className="rounded-xl bg-muted/50 p-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" aria-hidden />
              ویزیت حضوری
            </span>
            <span className="text-sm font-bold text-primary">{toman(doctor.visitFee)}</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 border-t pt-2 text-center">
            {fees.map(({ key, icon: Icon, fee }) => (
              <div key={key} className="rounded-lg bg-background px-1 py-1.5" title={`${VISIT_TYPE_LABELS[key]}: ${toman(fee)}`}>
                <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                  <Icon className="size-3" aria-hidden />
                  {VISIT_TYPE_LABELS[key]}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold tabular-nums">{toman(fee)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* next available */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-xs",
            nextAvail ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400" : "border-dashed text-muted-foreground"
          )}
        >
          {nextAvail ? (
            <>
              <span className="font-medium">نزدیک‌ترین نوبت ({faFromNow(nextAvail.dateISO)})</span>
              <span className="font-bold tabular-nums">
                {faDateShort(nextAvail.dateISO)} — {faTime(nextAvail.slot.time)}
              </span>
            </>
          ) : (
            <span className="w-full text-center">بدون نوبت در ۲ هفته آینده</span>
          )}
        </div>

        {/* actions */}
        <div className="mt-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/patient/book/${doctor.id}`}>مشاهده پروفایل</Link>
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/patient/book/${doctor.id}`}>رزرو نوبت</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
