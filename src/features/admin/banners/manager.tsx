"use client";

/**
 * /admin/banners — بنرها و تبلیغات: شبکه کارت‌های مرتب‌شده بر اساس «ترتیب نمایش»،
 * پیش‌نمایش گرادیانی رنگ، تغییر وضعیت فعال، افزودن/ویرایش (zod) و حذف با تأیید.
 */

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Image as ImageIcon, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAdminPanel } from "@/features/admin/shared";
import { useAppStore } from "@/store/app-store";
import { faNum, parseFaNumber, toFa } from "@/lib/fa";
import type { Banner } from "@/types";

/** پالت ۸ رنگ بنر (نمایشی) */
const HUE_PALETTE = [173, 220, 32, 280, 340, 258, 100, 200] as const;

function hueGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 45) % 360} 65% 55%))`;
}

/* -------------------------------- فرم بنر -------------------------------- */

const bannerSchema = z.object({
  title: z.string().trim().min(3, "عنوان بنر الزامی است (حداقل ۳ نویسه)"),
  subtitle: z.string().trim().optional(),
  link: z
    .string()
    .trim()
    .min(1, "لینک بنر را وارد کنید")
    .startsWith("/", "لینک باید با / شروع شود"),
  hue: z.number().int().min(0).max(359),
  order: z
    .number({ message: "ترتیب نمایش را وارد کنید" })
    .int("ترتیب باید عدد صحیح باشد")
    .min(1, "ترتیب باید حداقل ۱ باشد")
    .max(99, "ترتیب باید حداکثر ۹۹ باشد"),
});
type BannerValues = z.infer<typeof bannerSchema>;

interface BannerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Banner | null;
  actorName: string;
}

export function BannerDialog({ open, onOpenChange, editing, actorName }: BannerDialogProps) {
  const upsertBanner = useAppStore((s) => s.upsertBanner);
  const addAuditLog = useAppStore((s) => s.addAuditLog);
  const banners = useAppStore((s) => s.banners);
  const form = useForm<BannerValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: { title: "", subtitle: "", link: "/", hue: 173, order: 1 },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              title: editing.title,
              subtitle: editing.subtitle,
              link: editing.link,
              hue: editing.hue,
              order: editing.order,
            }
          : {
              title: "",
              subtitle: "",
              link: "/",
              hue: HUE_PALETTE[0],
              order: Math.max(0, ...banners.map((b) => b.order)) + 1,
            }
      );
    }
  }, [open, editing, form, banners]);

  const submit = form.handleSubmit((values) => {
    upsertBanner({
      id: editing?.id ?? `ban-${Date.now()}`,
      title: values.title,
      subtitle: values.subtitle ?? "",
      link: values.link,
      hue: values.hue,
      order: values.order,
      active: editing?.active ?? true,
    });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: editing ? "ویرایش بنر" : "ایجاد بنر",
      target: values.title,
    });
    toast.success(editing ? "بنر ویرایش شد" : "بنر جدید ثبت شد", { description: values.title });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" aria-hidden />
            {editing ? "ویرایش بنر" : "افزودن بنر"}
          </DialogTitle>
          <DialogDescription>
            بنرها در صفحه اصلی به ترتیب نمایش داده می‌شوند؛ رنگ جلد از پالت نمایشی انتخاب می‌شود (بدون آپلود).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>عنوان</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: نوبت‌دهی آنلاین بدون معطلی" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subtitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>زیرعنوان (اختیاری)</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: بیش از ۳۰ پزشک متخصص آماده پاسخ‌گویی" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>لینک</FormLabel>
                    <FormControl>
                      <Input dir="ltr" placeholder="/doctors" className="text-start font-mono" {...field} />
                    </FormControl>
                    <FormDescription className="text-[11px]">مسیر داخلی، مثلاً /doctors</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ترتیب نمایش</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        value={field.value ? faNum(field.value) : ""}
                        onChange={(e) => {
                          const n = parseFaNumber(e.target.value);
                          field.onChange(Number.isFinite(n) ? n : Number.NaN);
                        }}
                        placeholder="مثلاً: ۵"
                        className="h-9 tabular-nums"
                        aria-label="ترتیب نمایش بنر"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="hue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رنگ بنر</FormLabel>
                  <div className="flex flex-wrap items-center gap-2 pt-1" role="radiogroup" aria-label="انتخاب رنگ بنر">
                    {HUE_PALETTE.map((hue) => (
                      <button
                        key={hue}
                        type="button"
                        role="radio"
                        aria-checked={field.value === hue}
                        aria-label={`رنگ ${faNum(hue)}`}
                        className={`size-9 rounded-xl transition-all ${
                          field.value === hue
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "hover:scale-110"
                        }`}
                        style={{ background: hueGradient(hue) }}
                        onClick={() => field.onChange(hue)}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">{editing ? "ذخیره تغییرات" : "ثبت بنر"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- صفحه اصلی -------------------------------- */

export function AdminBannersManager() {
  const loading = useDemoLoading();
  const { actorName } = useAdminPanel();
  const banners = useAppStore((s) => s.banners);
  const upsertBanner = useAppStore((s) => s.upsertBanner);
  const deleteBanner = useAppStore((s) => s.deleteBanner);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const ordered = useMemo(() => [...banners].sort((a, b) => a.order - b.order), [banners]);
  const activeCount = useMemo(() => banners.filter((b) => b.active).length, [banners]);

  const toggleActive = (b: Banner) => {
    upsertBanner({ ...b, active: !b.active });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: b.active ? "غیرفعال‌سازی بنر" : "فعال‌سازی بنر",
      target: b.title,
    });
    toast.success(b.active ? `بنر «${b.title}» غیرفعال شد` : `بنر «${b.title}» فعال شد`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteBanner(deleteTarget.id);
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: "حذف بنر",
      target: deleteTarget.title,
    });
    toast.success(`بنر «${deleteTarget.title}» حذف شد`);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="بنرها و تبلیغات"
        description={`${faNum(banners.length)} بنر — ${faNum(activeCount)} فعال و ${faNum(banners.length - activeCount)} غیرفعال`}
        loading={loading}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            افزودن بنر
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="بنری ثبت نشده است"
          description="اولین بنر صفحه اصلی را بسازید."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              افزودن بنر
            </Button>
          }
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2" aria-label="فهرست بنرها">
          {ordered.map((b) => (
            <article
              key={b.id}
              className="group relative overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md"
            >
              <div
                className="relative min-h-40 p-5 text-white"
                style={{ background: hueGradient(b.hue) }}
                aria-hidden={false}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" aria-hidden />
                <div className="relative flex h-full flex-col justify-between gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="border-white/30 bg-white/20 text-white">ترتیب {faNum(b.order)}</Badge>
                        {!b.active && (
                          <Badge className="border-white/25 bg-black/30 text-white">غیرفعال</Badge>
                        )}
                      </div>
                      <h3 className="text-base leading-snug font-bold">{b.title}</h3>
                      {b.subtitle && <p className="text-sm text-white/85">{b.subtitle}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={b.active}
                        onCheckedChange={() => toggleActive(b)}
                        aria-label={`${b.active ? "غیرفعال‌سازی" : "فعال‌سازی"} بنر ${b.title}`}
                        className="data-[state=checked]:bg-white/90 data-[state=unchecked]:bg-white/30"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-white hover:bg-white/20 hover:text-white"
                            aria-label={`عملیات بنر ${b.title}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel>عملیات بنر</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(b);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" aria-hidden />
                            ویرایش
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(b)}>
                            <Trash2 className="size-4" aria-hidden />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-white/80" dir="ltr">
                    {toFa(b.link)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      <BannerDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} actorName={actorName} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" aria-hidden />
              حذف بنر
            </AlertDialogTitle>
            <AlertDialogDescription>
              بنر «{deleteTarget?.title}» برای همیشه حذف شود؟ این اقدام قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDelete}>
              بله، حذف شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
