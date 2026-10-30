"use client";

/**
 * /doctor/services — visit fee editor (4 fee kinds with zod validation and
 * toman formatting) + read-only price-range info of common specialty services.
 */

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Check,
  Info,
  MessageSquareText,
  Pencil,
  Phone,
  Stethoscope,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { CLINIC_SERVICES, SPECIALTY_LABELS } from "@/lib/constants";
import { faNum, parseFaNumber, toman, tomanCompact } from "@/lib/fa";
import { useDoctorPanel } from "@/features/doctor/shared";

const feeSchema = z
  .number({ message: "تعرفه را به تومان وارد کنید" })
  .int("تعرفه باید عدد صحیح باشد")
  .min(50_000, "تعرفه واردشده بسیار کم است");

type FeeKey = "visitFee" | "phoneFee" | "textFee" | "videoFee";

const FEES: { key: FeeKey; label: string; description: string; icon: LucideIcon }[] = [
  { key: "visitFee", label: "ویزیت حضوری", description: "نوبت در مطب یا کلینیک", icon: Stethoscope },
  { key: "phoneFee", label: "مشاوره تلفنی", description: "تماس صوتی با بیمار", icon: Phone },
  { key: "textFee", label: "مشاوره متنی", description: "پرسش و پاسخ کتبی", icon: MessageSquareText },
  { key: "videoFee", label: "مشاوره ویدیویی", description: "تماس تصویری با بیمار", icon: Video },
];

function FeeCard({
  feeKey,
  label,
  description,
  icon: Icon,
  current,
  onSave,
}: {
  feeKey: FeeKey;
  label: string;
  description: string;
  icon: LucideIcon;
  current: number;
  onSave: (key: FeeKey, value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  /** draft text while editing; null → derive display from the current fee */
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const value = draftValue ?? faNum(current);

  const startEditing = () => {
    setError(null);
    setDraftValue(faNum(current));
    setEditing(true);
  };

  const cancelEditing = () => {
    setError(null);
    setDraftValue(null);
    setEditing(false);
  };

  const blurFormat = () => {
    const n = parseFaNumber(value);
    if (Number.isFinite(n)) setDraftValue(faNum(n));
  };

  const save = () => {
    const n = parseFaNumber(value);
    const parsed = feeSchema.safeParse(n);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setError(null);
    onSave(feeKey, parsed.data);
    setDraftValue(null);
    setEditing(false);
  };

  return (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            {label}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="space-y-2">
            <Label htmlFor={`fee-${feeKey}`} className="sr-only">تعرفه {label}</Label>
            <Input
              id={`fee-${feeKey}`}
              inputMode="numeric"
              value={value}
              onChange={(e) => {
                setDraftValue(e.target.value);
                setError(null);
              }}
              onBlur={blurFormat}
              className="h-10 tabular-nums"
              aria-label={`تعرفه ${label} به تومان`}
            />
            {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={save}>
                <Check className="size-4" aria-hidden />
                ذخیره
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEditing}>
                انصراف
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-extrabold tabular-nums">{toman(current)}</p>
            <Button size="sm" variant="outline" className="h-8" onClick={startEditing}>
              <Pencil className="size-3.5" aria-hidden />
              ویرایش تعرفه
            </Button>
          </>
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground">نوبت‌ها و مشاوره‌های جدید با این تعرفه ثبت می‌شوند.</p>
      </CardContent>
    </Card>
  );
}

export function ServicesContent() {
  const loading = useDemoLoading();
  const { doctor } = useDoctorPanel();
  const updateDoctor = useAppStore((s) => s.updateDoctor);

  if (!doctor) {
    return <PageHeader title="خدمات و تعرفه‌ها" description="در حال بارگذاری…" loading={loading} />;
  }

  const specialtyServices = CLINIC_SERVICES.filter((s) => s.specialtyId === doctor.specialtyId);

  const saveFee = (key: FeeKey, value: number) => {
    updateDoctor(doctor.id, { [key]: value });
    toast.success("تعرفه به‌روزرسانی شد", { description: `تعرفه جدید: ${toman(value)} — از این پس نوبت‌های جدید با این مبلغ ثبت می‌شوند.` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="خدمات و تعرفه‌ها"
        description="تعرفه‌های ویزیت شما؛ بیماران پیش از رزرو این مبالغ را می‌بینند."
        loading={loading}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="تعرفه‌های ویزیت">
        {FEES.map((f) => (
          <FeeCard
            key={f.key}
            feeKey={f.key}
            label={f.label}
            description={f.description}
            icon={f.icon}
            current={doctor[f.key]}
            onSave={saveFee}
          />
        ))}
      </section>

      <section aria-label="خدمات تخصصی">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">خدمات رایج {SPECIALTY_LABELS[doctor.specialtyId]}</CardTitle>
            <CardDescription className="text-xs">
              بازه قیمت خدمات این تخصص در بازار (فقط برای اطلاع بیماران — تخفیف‌ها و تعرفه نهایی با شماست).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {specialtyServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">خدماتی برای این تخصص ثبت نشده است.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {specialtyServices.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm">
                    <span className="font-medium">{s.title}</span>
                    <Badge variant="outline" className="tabular-nums text-xs text-muted-foreground">
                      {tomanCompact(s.priceMin)} تا {tomanCompact(s.priceMax)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Alert className="mt-4">
              <Info className="size-4" aria-hidden />
              <AlertDescription>
                این بازه‌ها صرفاً نمایشی است و در فرایند رزرو نوبت اعمال نمی‌شود؛ مبلغ نهایی هر ویزیت بر اساس تعرفه‌های چهارگانه بالا محاسبه می‌شود.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
