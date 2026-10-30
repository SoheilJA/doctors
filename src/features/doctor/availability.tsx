"use client";

/**
 * /doctor/availability — weekly schedule editor (شنبه تا جمعه), off-days,
 * per-date overrides, live slot preview and booked-appointment conflict alerts.
 * Everything is edited in a DRAFT; nothing is saved until «ذخیره تقویم».
 */

import { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  Clock,
  Info,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { DURATIONS } from "@/lib/constants";
import { faDateMedium, faTime, JALALI_WEEKDAYS, minutesToTime, timeToMinutes, todayISO } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { findConflictingAppointments, generateSlotsForDate, findOffDay, timeRangeSchema, validateWeeklySchedule } from "@/lib/schedule";
import { useDoctorPanel } from "@/features/doctor/shared";
import type { Appointment, DateOverride, Doctor, OffDay, TimeRange, WeeklySchedule } from "@/types";

/* ------------------------- option helpers ------------------------- */

const genLocalId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now() % 10_000}`;

const TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let m = timeToMinutes("06:00"); m <= timeToMinutes("23:00"); m += 15) out.push(minutesToTime(m));
  return out;
})();

const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30, 45];
const MAX_SLOT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DRAFT_MAX_RANGES = 4;

const VISIT_RANGE_LABELS: Record<TimeRange["visitType"], string> = { "in-person": "حضوری", online: "آنلاین" };

function newRange(): TimeRange {
  return { id: genLocalId("tr"), start: "09:00", end: "13:00", visitType: "in-person", duration: 15, buffer: 0, maxPerSlot: 2 };
}

function rangeSummary(r: TimeRange): string {
  return `${faTime(r.start)} تا ${faTime(r.end)} (${VISIT_RANGE_LABELS[r.visitType]})`;
}

/* ------------------------- mini select ------------------------- */

function MiniSelect({
  label,
  value,
  onChange,
  options,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <label className="block min-w-0 space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full text-xs" aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

/* ------------------------- range editor row ------------------------- */

function RangeRow({
  range,
  onChange,
  onRemove,
  canRemove,
}: {
  range: TimeRange;
  onChange: (patch: Partial<TimeRange>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const timeOptions = TIME_OPTIONS.map((t) => ({ value: t, label: faTime(t) }));
  return (
    <div className="rounded-xl border bg-muted/30 p-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniSelect
          label="شروع"
          ariaLabel="ساعت شروع بازه"
          value={range.start}
          options={timeOptions}
          onChange={(v) => onChange({ start: v })}
        />
        <MiniSelect
          label="پایان"
          ariaLabel="ساعت پایان بازه"
          value={range.end}
          options={timeOptions}
          onChange={(v) => onChange({ end: v })}
        />
        <MiniSelect
          label="نوع ویزیت"
          ariaLabel="نوع ویزیت این بازه"
          value={range.visitType}
          options={[
            { value: "in-person", label: "حضوری" },
            { value: "online", label: "آنلاین" },
          ]}
          onChange={(v) => onChange({ visitType: v as TimeRange["visitType"] })}
        />
        <MiniSelect
          label="مدت ویزیت"
          ariaLabel="مدت هر ویزیت"
          value={String(range.duration)}
          options={DURATIONS.map((d) => ({ value: String(d), label: `${toFa(d)} دقیقه` }))}
          onChange={(v) => onChange({ duration: Number(v) })}
        />
        <MiniSelect
          label="فاصله بین نوبت‌ها"
          ariaLabel="فاصله بین نوبت‌ها"
          value={String(range.buffer)}
          options={BUFFER_OPTIONS.map((b) => ({ value: String(b), label: b === 0 ? "بدون فاصله" : `${toFa(b)} دقیقه` }))}
          onChange={(v) => onChange({ buffer: Number(v) })}
        />
        <MiniSelect
          label="حداکثر بیمار در نوبت"
          ariaLabel="حداکثر بیمار در هر نوبت"
          value={String(range.maxPerSlot)}
          options={MAX_SLOT_OPTIONS.map((m) => ({ value: String(m), label: `${toFa(m)} نفر` }))}
          onChange={(v) => onChange({ maxPerSlot: Number(v) })}
        />
        <div className="col-span-2 flex items-end sm:col-span-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-full text-rose-600 hover:text-rose-700"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label="حذف این بازه"
          >
            <Trash2 className="size-3.5" aria-hidden />
            حذف بازه
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------- weekday editor ------------------------- */

function WeekdayEditor({
  day,
  schedule,
  errors,
  onToggle,
  onUpdateRange,
  onAddRange,
  onRemoveRange,
}: {
  day: number;
  schedule: { active: boolean; ranges: TimeRange[] };
  errors?: string[];
  onToggle: (active: boolean) => void;
  onUpdateRange: (rangeId: string, patch: Partial<TimeRange>) => void;
  onAddRange: () => void;
  onRemoveRange: (rangeId: string) => void;
}) {
  return (
    <Card className={schedule.active ? "" : "opacity-80"}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2.5">
          <Switch
            id={`day-${day}`}
            checked={schedule.active}
            onCheckedChange={onToggle}
            aria-label={`${JALALI_WEEKDAYS[day]} ${schedule.active ? "فعال" : "غیرفعال"}`}
          />
          <label htmlFor={`day-${day}`} className="text-sm font-semibold">
            {JALALI_WEEKDAYS[day]}
          </label>
          {schedule.active && schedule.ranges.length > 0 && (
            <Badge variant="outline" className="text-[11px] text-muted-foreground">
              {toFa(schedule.ranges.length)} بازه
            </Badge>
          )}
        </div>
        {schedule.active && (
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={onAddRange} disabled={schedule.ranges.length >= DRAFT_MAX_RANGES}>
            <Plus className="size-3.5" aria-hidden />
            افزودن بازه
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {!schedule.active ? (
          <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">این روز غیرفعال است و نوبتی رزرو نمی‌شود.</p>
        ) : schedule.ranges.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            هنوز بازه‌ای ثبت نشده؛ «افزودن بازه» را بزنید.
          </p>
        ) : (
          schedule.ranges.map((r) => (
            <RangeRow
              key={r.id}
              range={r}
              canRemove={schedule.ranges.length > 1}
              onChange={(patch) => onUpdateRange(r.id, patch)}
              onRemove={() => onRemoveRange(r.id)}
            />
          ))
        )}
        {errors && errors.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-600 dark:text-rose-400" role="alert">
            {errors.map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------- off-days ------------------------- */

const offDaySchema = z
  .object({
    startDate: z.string().min(1, "تاریخ شروع را انتخاب کنید"),
    endDate: z.string().min(1, "تاریخ پایان را انتخاب کنید"),
    reason: z.string().trim().min(3, "دلیل تعطیلی را وارد کنید"),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "تاریخ پایان باید برابر یا بعد از تاریخ شروع باشد",
    path: ["endDate"],
  });

type OffDayForm = z.infer<typeof offDaySchema>;

function OffDaysCard({
  draftOffDays,
  savedIds,
  onAdd,
  onRemove,
}: {
  draftOffDays: OffDay[];
  savedIds: Set<string>;
  onAdd: (offDay: OffDay) => void;
  onRemove: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const form = useForm<OffDayForm>({
    resolver: zodResolver(offDaySchema),
    defaultValues: { startDate: "", endDate: "", reason: "" },
  });

  const submit = (values: OffDayForm) => {
    onAdd({ id: genLocalId("off"), ...values });
    form.reset();
    toast.success("تعطیلی به پیش‌نویس اضافه شد", { description: "برای اعمال در رزرو بیماران، «ذخیره تقویم» را بزنید." });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarOff className="size-4 text-primary" aria-hidden />
          تعطیلات و مرخصی‌ها
        </CardTitle>
        <CardDescription className="text-xs">در این روزها هیچ نوبتی رزرو نمی‌شود.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {draftOffDays.length === 0 ? (
          <EmptyState icon={CalendarOff} title="تعطیلی ثبت نشده است" description="مرخصی یا تعطیلات خود را اضافه کنید تا بیماران نتوانند نوبت بگیرند." className="py-8" />
        ) : (
          <ul className="divide-y rounded-xl border">
            {draftOffDays.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {faDateMedium(o.startDate)} تا {faDateMedium(o.endDate)}
                  </p>
                  <p className="text-xs text-muted-foreground">{o.reason}</p>
                </div>
                {!savedIds.has(o.id) && <Badge variant="outline" className="text-[10px] text-amber-600">پیش‌نویس</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-rose-600 hover:text-rose-700"
                  aria-label={`حذف تعطیلی ${o.reason}`}
                  onClick={() => setConfirmId(o.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-3 rounded-xl border border-dashed p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Plus className="size-4 text-primary" aria-hidden />
              افزودن تعطیلی جدید
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">از تاریخ</FormLabel>
                    <FormControl>
                      <JalaliDatePicker value={field.value || undefined} onChange={(iso) => field.onChange(iso ?? "")} placeholder="انتخاب تاریخ شروع" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">تا تاریخ</FormLabel>
                    <FormControl>
                      <JalaliDatePicker value={field.value || undefined} onChange={(iso) => field.onChange(iso ?? "")} placeholder="انتخاب تاریخ پایان" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">دلیل</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="مثلاً: مرخصی استعلاجی، سفر کاری…" className="h-9 text-sm" aria-label="دلیل تعطیلی" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="outline" size="sm" className="h-9">
              افزودن به پیش‌نویس
            </Button>
          </form>
        </Form>

        <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف این تعطیلی از پیش‌نویس؟</AlertDialogTitle>
              <AlertDialogDescription>
                این تغییر فقط پس از «ذخیره تقویم» روی رزرو بیماران اعمال می‌شود و تا آن لحظه با «بازنشانی پیش‌نویس» قابل بازگشت است.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={() => {
                  if (confirmId) onRemove(confirmId);
                  setConfirmId(null);
                }}
              >
                حذف کن
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

/* ------------------------- overrides ------------------------- */

const overrideSchema = z.object({
  date: z.string().min(1, "تاریخ را انتخاب کنید"),
  note: z.string().trim().optional(),
  ranges: z
    .array(timeRangeSchema)
    .min(1, "حداقل یک بازه ساعات کاری وارد کنید")
    .max(2, "حداکثر دو بازه برای ساعت ویژه مجاز است")
    .superRefine((ranges, ctx) => {
      const sorted = [...ranges].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          if (timeToMinutes(sorted[j].start) < timeToMinutes(sorted[i].end)) {
            ctx.addIssue({ code: "custom", message: "بازه‌ها نباید همپوشانی داشته باشند؛ لطفاً ساعات را اصلاح کنید" });
            return;
          }
        }
      }
    }),
});

type OverrideForm = z.infer<typeof overrideSchema>;

function OverridesCard({
  draftOverrides,
  savedIds,
  onAdd,
  onRemove,
}: {
  draftOverrides: DateOverride[];
  savedIds: Set<string>;
  onAdd: (override: DateOverride) => void;
  onRemove: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const form = useForm<OverrideForm>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      date: "",
      note: "",
      ranges: [{ start: "09:00", end: "13:00", visitType: "in-person", duration: 15, buffer: 0, maxPerSlot: 2 }],
    },
  });
  const rangesArray = useFieldArray({ control: form.control, name: "ranges" });

  const submit = (values: OverrideForm) => {
    onAdd({
      id: genLocalId("ovr"),
      date: values.date,
      note: values.note?.trim() ? values.note.trim() : undefined,
      ranges: values.ranges.map((r) => ({ ...r, id: genLocalId("tr") })),
    });
    form.reset({ date: "", note: "", ranges: [{ start: "09:00", end: "13:00", visitType: "in-person", duration: 15, buffer: 0, maxPerSlot: 2 }] });
    toast.success("ساعت ویژه به پیش‌نویس اضافه شد", { description: "برای اعمال در رزرو بیماران، «ذخیره تقویم» را بزنید." });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" aria-hidden />
          ساعات ویژه تاریخ خاص
        </CardTitle>
        <CardDescription className="text-xs">
          این ساعات جای برنامه هفتگی همان روز را می‌گیرد (مثلاً شیفت اضافه یا کوتاه).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {draftOverrides.length === 0 ? (
          <EmptyState icon={CalendarPlus} title="ساعت ویژه‌ای ثبت نشده است" description="برای روزهای خاص، ساعات کاری متفاوت تعریف کنید." className="py-8" />
        ) : (
          <ul className="divide-y rounded-xl border">
            {draftOverrides.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{faDateMedium(o.date)}</p>
                  <p className="text-xs text-muted-foreground">{o.ranges.map(rangeSummary).join(" • ")}</p>
                  {o.note && <p className="mt-0.5 text-[11px] text-muted-foreground/80">یادداشت: {o.note}</p>}
                </div>
                {!savedIds.has(o.id) && <Badge variant="outline" className="text-[10px] text-amber-600">پیش‌نویس</Badge>}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-rose-600 hover:text-rose-700"
                  aria-label="حذف ساعت ویژه"
                  onClick={() => setConfirmId(o.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-3 rounded-xl border border-dashed p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Plus className="size-4 text-primary" aria-hidden />
              افزودن ساعت ویژه
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">تاریخ</FormLabel>
                    <FormControl>
                      <JalaliDatePicker value={field.value || undefined} onChange={(iso) => field.onChange(iso ?? "")} placeholder="انتخاب تاریخ" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs">یادداشت (اختیاری)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثلاً: شیفت اضافه کلینیک" className="h-9 text-sm" aria-label="یادداشت ساعت ویژه" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              {rangesArray.fields.map((f, i) => (
                <div key={f.id} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`ranges.${i}.start`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">شروع بازه {toFa(i + 1)}</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-8 text-xs" aria-label="ساعت شروع">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {faTime(t)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ranges.${i}.end`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">پایان بازه {toFa(i + 1)}</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-8 text-xs" aria-label="ساعت پایان">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                {TIME_OPTIONS.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {faTime(t)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ranges.${i}.visitType`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">نوع ویزیت</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-8 text-xs" aria-label="نوع ویزیت بازه">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in-person">حضوری</SelectItem>
                                <SelectItem value="online">آنلاین</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ranges.${i}.duration`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">مدت ویزیت</FormLabel>
                          <FormControl>
                            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                              <SelectTrigger className="h-8 text-xs" aria-label="مدت ویزیت">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DURATIONS.map((d) => (
                                  <SelectItem key={d} value={String(d)}>
                                    {toFa(d)} دقیقه
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ranges.${i}.buffer`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">فاصله بین نوبت‌ها</FormLabel>
                          <FormControl>
                            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                              <SelectTrigger className="h-8 text-xs" aria-label="فاصله بین نوبت‌ها">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {BUFFER_OPTIONS.map((b) => (
                                  <SelectItem key={b} value={String(b)}>
                                    {b === 0 ? "بدون فاصله" : `${toFa(b)} دقیقه`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ranges.${i}.maxPerSlot`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs">حداکثر بیمار در نوبت</FormLabel>
                          <FormControl>
                            <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                              <SelectTrigger className="h-8 text-xs" aria-label="حداکثر بیمار در هر نوبت">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MAX_SLOT_OPTIONS.map((m) => (
                                  <SelectItem key={m} value={String(m)}>
                                    {toFa(m)} نفر
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {rangesArray.fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-600"
                      onClick={() => rangesArray.remove(i)}
                    >
                      <Trash2 className="size-3" aria-hidden />
                      حذف بازه {toFa(i + 1)}
                    </Button>
                  )}
                </div>
              ))}
              <div>
                {form.formState.errors.ranges?.message && (
                  <p className="mb-2 text-xs text-rose-600">{form.formState.errors.ranges.message}</p>
                )}
                {rangesArray.fields.length < 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() =>
                      rangesArray.append({ start: "16:00", end: "19:00", visitType: "in-person", duration: 15, buffer: 0, maxPerSlot: 2 })
                    }
                  >
                    <Plus className="size-3.5" aria-hidden />
                    بازه دوم
                  </Button>
                )}
              </div>
            </div>
            <Button type="submit" variant="outline" size="sm" className="h-9">
              افزودن به پیش‌نویس
            </Button>
          </form>
        </Form>

        <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف این ساعت ویژه از پیش‌نویس؟</AlertDialogTitle>
              <AlertDialogDescription>
                این تغییر فقط پس از «ذخیره تقویم» اعمال می‌شود و تا آن لحظه قابل بازگشت است.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction
                className="bg-rose-600 text-white hover:bg-rose-700"
                onClick={() => {
                  if (confirmId) onRemove(confirmId);
                  setConfirmId(null);
                }}
              >
                حذف کن
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

/* ------------------------- editor (keyed, remounts on apply/reset) ------------------------- */

interface AvailabilityEditorProps {
  doctor: Doctor;
  appointments: Appointment[];
  loading: boolean;
  /** triggers a remount so drafts re-initialize from the fresh store */
  onApplied: () => void;
}

function AvailabilityEditor({ doctor, appointments: allAppointments, loading, onApplied }: AvailabilityEditorProps) {
  const updateDoctorSchedule = useAppStore((s) => s.updateDoctorSchedule);
  const addDoctorOffDay = useAppStore((s) => s.addDoctorOffDay);
  const removeDoctorOffDay = useAppStore((s) => s.removeDoctorOffDay);
  const addDoctorOverride = useAppStore((s) => s.addDoctorOverride);
  const removeDoctorOverride = useAppStore((s) => s.removeDoctorOverride);

  const [draft, setDraft] = useState<WeeklySchedule>(() => structuredClone(doctor.weeklySchedule));
  const [draftOffDays, setDraftOffDays] = useState<OffDay[]>(() => doctor.offDays.map((o) => ({ ...o })));
  const [draftOverrides, setDraftOverrides] = useState<DateOverride[]>(
    () => doctor.overrides.map((o) => ({ ...o, ranges: o.ranges.map((r) => ({ ...r })) }))
  );
  const [previewDate, setPreviewDate] = useState<string | undefined>(todayISO());

  const savedOffIds = useMemo(() => new Set(doctor.offDays.map((o) => o.id)), [doctor.offDays]);
  const savedOvrIds = useMemo(() => new Set(doctor.overrides.map((o) => o.id)), [doctor.overrides]);

  const errors = useMemo(() => validateWeeklySchedule(draft), [draft]);
  const errorCount = Object.keys(errors).length;

  const mergedDoctor: Doctor = useMemo(
    () => ({ ...doctor, weeklySchedule: draft, offDays: draftOffDays, overrides: draftOverrides }),
    [doctor, draft, draftOffDays, draftOverrides]
  );

  const conflicts = useMemo(
    () =>
      findConflictingAppointments(mergedDoctor, allAppointments).filter((a) => a.status !== "completed"),
    [mergedDoctor, allAppointments]
  );

  const previewSlots = useMemo(
    () => (previewDate ? generateSlotsForDate(mergedDoctor, previewDate, allAppointments) : []),
    [mergedDoctor, previewDate, allAppointments]
  );

  const previewOffDay = previewDate ? findOffDay(mergedDoctor, previewDate) : undefined;
  const previewOverride = previewDate ? mergedDoctor.overrides.find((o) => o.date === previewDate) : undefined;

  /* draft mutators */

  const toggleDay = (day: number, active: boolean) => {
    setDraft((prev) => {
      const current = prev[day] ?? { active: false, ranges: [] };
      return { ...prev, [day]: { ...current, active, ranges: active && current.ranges.length === 0 ? [newRange()] : current.ranges } };
    });
  };

  const addRange = (day: number) => {
    const current = draft[day] ?? { active: true, ranges: [] };
    if (current.ranges.length >= DRAFT_MAX_RANGES) {
      toast.error(`حداکثر ${toFa(DRAFT_MAX_RANGES)} بازه در هر روز مجاز است`);
      return;
    }
    setDraft((prev) => {
      const dayDraft = prev[day] ?? { active: true, ranges: [] };
      if (dayDraft.ranges.length >= DRAFT_MAX_RANGES) return prev;
      return { ...prev, [day]: { ...dayDraft, ranges: [...dayDraft.ranges, newRange()] } };
    });
  };

  const removeRange = (day: number, rangeId: string) => {
    setDraft((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return { ...prev, [day]: { ...current, ranges: current.ranges.filter((r) => r.id !== rangeId) } };
    });
  };

  const updateRange = (day: number, rangeId: string, patch: Partial<TimeRange>) => {
    setDraft((prev) => {
      const current = prev[day];
      if (!current) return prev;
      return { ...prev, [day]: { ...current, ranges: current.ranges.map((r) => (r.id === rangeId ? { ...r, ...patch } : r)) } };
    });
  };

  const resetDrafts = () => {
    onApplied();
    toast.info("پیش‌نویس به وضعیت ذخیره‌شده بازگشت");
  };

  const save = () => {
    if (errorCount > 0) {
      toast.error("ابتدا خطاهای تقویم را برطرف کنید");
      return;
    }
    updateDoctorSchedule(doctor.id, draft);
    const draftOffIds = new Set(draftOffDays.map((o) => o.id));
    for (const o of doctor.offDays) if (!draftOffIds.has(o.id)) removeDoctorOffDay(doctor.id, o.id);
    for (const o of draftOffDays) if (!doctor.offDays.some((x) => x.id === o.id)) addDoctorOffDay(doctor.id, o);
    const draftOvrIds = new Set(draftOverrides.map((o) => o.id));
    for (const o of doctor.overrides) if (!draftOvrIds.has(o.id)) removeDoctorOverride(doctor.id, o.id);
    for (const o of draftOverrides) if (!doctor.overrides.some((x) => x.id === o.id)) addDoctorOverride(doctor.id, o);
    toast.success("تقویم شما به‌روزرسانی شد و در رزرو بیماران اعمال می‌شود");
    onApplied();
  };

  const previewEmptySlots = previewSlots.filter((s) => s.remaining > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="روزها و ساعات کاری"
        description="برنامه هفتگی، تعطیلات و ساعات ویژه شما؛ همه تغییرات ابتدا به‌صورت پیش‌نویس ذخیره می‌شوند."
        loading={loading}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={resetDrafts}>
              <RotateCcw className="size-4" aria-hidden />
              بازنشانی پیش‌نویس
            </Button>
            <Button size="sm" onClick={save} disabled={errorCount > 0 || loading}>
              <Save className="size-4" aria-hidden />
              ذخیره تقویم
            </Button>
          </>
        }
      />

      {errorCount > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden />
          <AlertTitle>تقویم ذخیره نمی‌شود تا خطاها برطرف شوند</AlertTitle>
          <AlertDescription>
            {Object.entries(errors)
              .map(([day, msgs]) => `${day}: ${msgs[0]}`)
              .join(" — ")}
          </AlertDescription>
        </Alert>
      )}

      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" aria-hidden />
          <AlertTitle>{`تضاد با ${toFa(conflicts.length)} نوبت رزروشده`}</AlertTitle>
          <AlertDescription>
            <p className="mb-1">با این تغییرات، نوبت‌های رزروشده زیر دیگر در ساعات کاری نمی‌گنجند؛ با ذخیره تقویم این نوبت‌ها بدون جایگزین می‌مانند:</p>
            <ul className="list-inside list-disc space-y-0.5 text-xs">
              {conflicts.slice(0, 4).map((a) => (
                <li key={a.id}>
                  {toFa(a.code)} — {faDateMedium(a.date)} ساعت {faTime(a.time)}
                </li>
              ))}
              {conflicts.length > 4 && <li>…و {toFa(conflicts.length - 4)} مورد دیگر</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* weekly editor */}
        <section className="space-y-4 xl:col-span-2" aria-label="برنامه هفتگی">
          {JALALI_WEEKDAYS.map((label, day) => (
            <WeekdayEditor
              key={day}
              day={day}
              schedule={draft[day] ?? { active: false, ranges: [] }}
              errors={errors[label]}
              onToggle={(active) => toggleDay(day, active)}
              onAddRange={() => addRange(day)}
              onRemoveRange={(rangeId) => removeRange(day, rangeId)}
              onUpdateRange={(rangeId, patch) => updateRange(day, rangeId, patch)}
            />
          ))}
        </section>

        {/* live preview */}
        <section className="space-y-4" aria-label="پیش‌نمایش زنده نوبت‌ها">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4 text-primary" aria-hidden />
                پیش‌نمایش زنده نوبت‌ها
              </CardTitle>
              <CardDescription className="text-xs">نوبت‌های این تاریخ بر اساس پیش‌نویس فعلی شما.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <JalaliDatePicker
                value={previewDate}
                onChange={(iso) => setPreviewDate(iso ?? todayISO())}
                aria-label="تاریخ پیش‌نمایش"
                placeholder="انتخاب تاریخ"
              />
              {loading ? (
                <div className="h-40 animate-pulse rounded-xl bg-muted" />
              ) : previewOffDay && !previewOverride ? (
                <EmptyState icon={CalendarOff} title="این روز تعطیل است" description={`دلیل: ${previewOffDay.reason}`} className="py-10" />
              ) : previewSlots.length === 0 ? (
                <EmptyState icon={CalendarClock} title="در این تاریخ ساعات کاری ثبت نشده است" description="برنامه این روز هفته را فعال کنید یا ساعت ویژه تعریف کنید." className="py-10" />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {previewOverride && <Badge variant="outline" className="text-[10px] text-violet-600">ساعت ویژه</Badge>}
                    <span>
                      {toFa(previewSlots.length)} نوبت — {toFa(previewEmptySlots.length)} خالی — {toFa(previewSlots.length - previewEmptySlots.length)} رزروشده/تکمیل
                    </span>
                  </div>
                  <div className="flex max-h-96 flex-wrap gap-1.5 overflow-y-auto" aria-label="نوبت‌های پیش‌نمایش">
                    {previewSlots.map((s) => (
                      <span
                        key={s.time}
                        title={`ظرفیت آزاد: ${toFa(s.remaining)} از ${toFa(s.maxPerSlot)}`}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums ${
                          s.remaining === 0
                            ? "border-muted bg-muted/60 text-muted-foreground line-through"
                            : s.bookedCount > 0
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {faTime(s.time)}
                        <span className="text-[10px] font-normal">
                          {s.remaining === 0 ? "تکمیل" : `${toFa(s.remaining)}/${toFa(s.maxPerSlot)}`}
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    اعداد هر نوبت، ظرفیت آزاد از کل ظرفیت است؛ خط‌خورده‌ها تکمیل شده‌اند.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <OffDaysCard
            draftOffDays={draftOffDays}
            savedIds={savedOffIds}
            onAdd={(o) => setDraftOffDays((prev) => [...prev, o])}
            onRemove={(id) => setDraftOffDays((prev) => prev.filter((o) => o.id !== id))}
          />
        </section>
      </div>

      <Separator />

      <OverridesCard
        draftOverrides={draftOverrides}
        savedIds={savedOvrIds}
        onAdd={(o) => setDraftOverrides((prev) => [...prev, o])}
        onRemove={(id) => setDraftOverrides((prev) => prev.filter((o) => o.id !== id))}
      />
    </div>
  );
}

/* ------------------------- main content ------------------------- */

export function AvailabilityContent() {
  const loading = useDemoLoading();
  const { doctor } = useDoctorPanel();
  const allAppointments = useAppStore((s) => s.appointments);
  const [resetKey, setResetKey] = useState(0);

  if (!doctor) {
    return <PageHeader title="روزها و ساعات کاری" description="برنامه هفتگی شما" loading={loading} />;
  }

  return (
    <AvailabilityEditor
      key={resetKey}
      doctor={doctor}
      appointments={allAppointments}
      loading={loading}
      onApplied={() => setResetKey((k) => k + 1)}
    />
  );
}
