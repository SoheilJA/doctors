"use client";

/**
 * NewLabOrderDialog — سفارش آزمایش جدید: آزمایشگاه، آزمایش‌ها، نمونه‌گیری در منزل، نسخه و پزشک معرف.
 */

import { useMemo, useState } from "react";
import { FileUp, FlaskConical, Home, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { faNum, toFa, toman } from "@/lib/fa";
import { LAB_TESTS, SPECIALTY_LABELS } from "@/lib/constants";
import type { Doctor, LabOrderTest, MedicalCenter, Patient } from "@/types";

interface NewLabOrderDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  labs: MedicalCenter[];
  doctors: Doctor[];
  patient: Patient;
  onCreated: (input: {
    labId: string;
    doctorId?: string;
    tests: LabOrderTest[];
    homeSampling: boolean;
    prescriptionFile?: { name: string; sizeKB: number; type: "pdf" };
  }) => void;
}

export function NewLabOrderDialog({ open, onOpenChange, labs, doctors, patient, onCreated }: NewLabOrderDialogProps) {
  const [labId, setLabId] = useState("");
  const [testIds, setTestIds] = useState<string[]>([]);
  const [homeSampling, setHomeSampling] = useState(false);
  const [doctorId, setDoctorId] = useState<string>("none");
  const [prescription, setPrescription] = useState<{ name: string; sizeKB: number; type: "pdf" } | null>(null);

  const lab = labs.find((l) => l.id === labId);
  const tests: LabOrderTest[] = useMemo(
    () =>
      LAB_TESTS.filter((t) => testIds.includes(t.id)).map((t) => ({ id: t.id, name: t.name, price: t.price })),
    [testIds]
  );
  const total = tests.reduce((s, t) => s + t.price, 0);

  const toggleTest = (id: string) =>
    setTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    if (!lab) return toast.error("آزمایشگاه را انتخاب کنید");
    if (!tests.length) return toast.error("حداقل یک آزمایش انتخاب کنید");
    if (homeSampling && !lab.homeSampling) {
      setHomeSampling(false);
      return toast.error("این آزمایشگاه نمونه‌گیری در منزل ندارد");
    }
    onCreated({
      labId: lab.id,
      doctorId: doctorId === "none" ? undefined : doctorId,
      tests,
      homeSampling,
      prescriptionFile: prescription ?? undefined,
    });
    // reset
    setLabId("");
    setTestIds([]);
    setHomeSampling(false);
    setDoctorId("none");
    setPrescription(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-primary" aria-hidden />
            سفارش آزمایش جدید
          </DialogTitle>
          <DialogDescription>
            آزمایشگاه و آزمایش‌های موردنظر را انتخاب کنید؛ نتیجه در پرونده پزشکی شما ثبت می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* lab */}
          <div className="space-y-1.5">
            <Label>آزمایشگاه</Label>
            <Select value={labId || undefined} onValueChange={(v) => { setLabId(v); setHomeSampling(false); }}>
              <SelectTrigger aria-label="انتخاب آزمایشگاه">
                <SelectValue placeholder="انتخاب آزمایشگاه…" />
              </SelectTrigger>
              <SelectContent>
                {labs.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} — {l.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lab && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="outline" className="text-xs">{lab.city}</Badge>
                {lab.homeSampling ? (
                  <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400">
                    <Home className="size-3" aria-hidden />
                    نمونه‌گیری در منزل
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">بدون نمونه‌گیری در منزل</Badge>
                )}
              </div>
            )}
          </div>

          {/* tests */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>آزمایش‌ها</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{faNum(testIds.length)} مورد انتخاب‌شده</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LAB_TESTS.map((t) => (
                <label
                  key={t.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-sm transition-colors",
                    testIds.includes(t.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <Checkbox checked={testIds.includes(t.id)} onCheckedChange={() => toggleTest(t.id)} aria-label={t.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block text-[11px] text-muted-foreground">{t.category}</span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-primary tabular-nums">{toman(t.price)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* home sampling */}
          {lab?.homeSampling ? (
            <div className="flex items-center justify-between rounded-xl border border-dashed px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Home className="size-4 text-emerald-600" aria-hidden />
                <Label htmlFor="home-sampling" className="cursor-pointer text-sm">
                  نمونه‌گیری در منزل
                </Label>
              </div>
              <Switch id="home-sampling" checked={homeSampling} onCheckedChange={setHomeSampling} />
            </div>
          ) : null}

          {/* prescription upload */}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => {
              setPrescription({ name: "نسخه-آزمایش.pdf", sizeKB: 180, type: "pdf" });
              toast.success("نسخه نمونه پیوست شد (شبیه‌سازی)");
            }}>
              <FileUp className="size-4" aria-hidden />
              پیوست نسخه پزشک
            </Button>
            {prescription && (
              <Badge variant="secondary" className="gap-1.5 py-1.5 text-xs tabular-nums">
                <FileUp className="size-3" aria-hidden />
                {prescription.name} ({toFa(prescription.sizeKB)} کیلوبایت)
                <button
                  type="button"
                  aria-label="حذف نسخه"
                  className="text-rose-500 hover:text-rose-600"
                  onClick={() => setPrescription(null)}
                >
                  ×
                </button>
              </Badge>
            )}
          </div>

          {/* referral doctor */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Stethoscope className="size-3.5" aria-hidden />
              پزشک معرف (اختیاری)
            </Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger aria-label="پزشک معرف">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون پزشک معرف</SelectItem>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} — {SPECIALTY_LABELS[d.specialtyId]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* summary */}
          <div className="rounded-2xl border bg-muted/50 p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">مجموع {faNum(tests.length)} آزمایش</span>
              <span className="text-base font-extrabold text-primary tabular-nums">{toman(total)}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              پرداخت پس از ثبت سفارش امکان‌پذیر است؛ برای بیمار «{patient.name}» ثبت می‌شود.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={submit}>ثبت سفارش</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
