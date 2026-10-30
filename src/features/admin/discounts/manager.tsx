"use client";

/**
 * /admin/discounts — مدیریت کدهای تخفیف: آمار کلی، فهرست با جستجو و فیلتر فعال/غیرفعال،
 * افزودن/ویرایش کد (RHF + zod با پیام‌های فارسی)، تغییر وضعیت فعال و حذف با تأیید.
 */

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  BadgePercent,
  MoreHorizontal,
  Pencil,
  Plus,
  TicketCheck,
  TicketPercent,
  Trash2,
} from "lucide-react";
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
import { DataTable } from "@/components/shared/data-table";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAdminPanel } from "@/features/admin/shared";
import { useAppStore } from "@/store/app-store";
import { faNum, faPercent, parseFaNumber, toFa, toman } from "@/lib/fa";
import { faDateShort, isPastISO } from "@/lib/jalali";
import type { DiscountCode } from "@/types";

const ALL = "all";
type ActiveFilter = typeof ALL | "active" | "inactive";

/* ------------------------------- فرم کد تخفیف ------------------------------- */

const discountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, "کد تخفیف معتبر نیست")
    .regex(/^[A-Za-z0-9_-]+$/, "کد تخفیف معتبر نیست (فقط حرف انگلیسی، رقم و خط تیره)"),
  percent: z
    .number({ message: "درصد تخفیف را وارد کنید" })
    .int("درصد باید عدد صحیح باشد")
    .min(1, "درصد باید بین ۱ تا ۱۰۰ باشد")
    .max(100, "درصد باید بین ۱ تا ۱۰۰ باشد"),
  maxUses: z
    .number({ message: "سقف استفاده را وارد کنید" })
    .int("سقف استفاده باید عدد صحیح باشد")
    .min(1, "سقف استفاده باید حداقل ۱ باشد"),
  minAmount: z
    .number({ message: "حداقل مبلغ را وارد کنید" })
    .int("حداقل مبلغ باید عدد صحیح باشد")
    .min(0, "حداقل مبلغ معتبر نیست"),
  expiresAtISO: z.string().min(1, "تاریخ انقضا را انتخاب کنید"),
});
type DiscountValues = z.infer<typeof discountSchema>;

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: DiscountCode | null;
  actorName: string;
}

export function DiscountDialog({ open, onOpenChange, editing, actorName }: DiscountDialogProps) {
  const upsertDiscountCode = useAppStore((s) => s.upsertDiscountCode);
  const addAuditLog = useAppStore((s) => s.addAuditLog);
  const form = useForm<DiscountValues>({
    resolver: zodResolver(discountSchema),
    defaultValues: { code: "", percent: 15, maxUses: 100, minAmount: 0, expiresAtISO: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              code: editing.code,
              percent: editing.percent,
              maxUses: editing.maxUses,
              minAmount: editing.minAmount,
              expiresAtISO: editing.expiresAtISO,
            }
          : { code: "", percent: 15, maxUses: 100, minAmount: 0, expiresAtISO: "" }
      );
    }
  }, [open, editing, form]);

  const submit = form.handleSubmit((values) => {
    const code = values.code.trim().toUpperCase();
    upsertDiscountCode({
      id: editing?.id ?? `dc-${Date.now()}`,
      code,
      percent: values.percent,
      maxUses: values.maxUses,
      minAmount: values.minAmount,
      expiresAtISO: values.expiresAtISO,
      active: editing?.active ?? true,
      usedCount: editing?.usedCount ?? 0,
    });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: editing ? "ویرایش کد تخفیف" : "ایجاد کد تخفیف",
      target: `${code} — ${faPercent(values.percent)}`,
    });
    toast.success(editing ? "کد تخفیف ویرایش شد" : "کد تخفیف جدید ثبت شد", {
      description: `کد ${code} با تخفیف ${faPercent(values.percent)}`,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TicketPercent className="size-5 text-primary" aria-hidden />
            {editing ? "ویرایش کد تخفیف" : "افزودن کد تخفیف"}
          </DialogTitle>
          <DialogDescription>
            کدها به‌صورت حروف بزرگ انگلیسی ذخیره می‌شوند؛ حداقل مبلغ بر حسب تومان است.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کد تخفیف</FormLabel>
                  <FormControl>
                    <Input
                      dir="ltr"
                      placeholder="مثلاً SAVE20"
                      className="text-start font-mono uppercase tracking-wide"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">حداقل ۳ نویسه انگلیسی، رقم یا خط تیره.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>درصد تخفیف</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        value={field.value ? faNum(field.value) : ""}
                        onChange={(e) => {
                          const n = parseFaNumber(e.target.value);
                          field.onChange(Number.isFinite(n) ? n : Number.NaN);
                        }}
                        placeholder="مثلاً: ۲۰"
                        className="h-9 tabular-nums"
                        aria-label="درصد تخفیف"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxUses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سقف استفاده</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="numeric"
                        value={field.value ? faNum(field.value) : ""}
                        onChange={(e) => {
                          const n = parseFaNumber(e.target.value);
                          field.onChange(Number.isFinite(n) ? n : Number.NaN);
                        }}
                        placeholder="مثلاً: ۲۰۰"
                        className="h-9 tabular-nums"
                        aria-label="سقف تعداد استفاده"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="minAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>حداقل مبلغ سفارش (تومان)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      value={field.value ? faNum(field.value) : "۰"}
                      onChange={(e) => {
                        const n = parseFaNumber(e.target.value);
                        field.onChange(Number.isFinite(n) ? n : Number.NaN);
                      }}
                      placeholder="مثلاً: ۲۰۰٬۰۰۰"
                      className="h-9 tabular-nums"
                      aria-label="حداقل مبلغ سفارش به تومان"
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">برای بدون محدودیت، ۰ وارد کنید.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresAtISO"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاریخ انقضا</FormLabel>
                  <FormControl>
                    <JalaliDatePicker
                      value={field.value || undefined}
                      onChange={(iso) => field.onChange(iso ?? "")}
                      placeholder="انتخاب تاریخ انقضا"
                      aria-label="تاریخ انقضای کد تخفیف"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">{editing ? "ذخیره تغییرات" : "ثبت کد تخفیف"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- صفحه اصلی -------------------------------- */

export function AdminDiscountsManager() {
  const loading = useDemoLoading();
  const { actorName } = useAdminPanel();
  const codes = useAppStore((s) => s.discountCodes);
  const upsertDiscountCode = useAppStore((s) => s.upsertDiscountCode);
  const deleteDiscountCode = useAppStore((s) => s.deleteDiscountCode);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);

  const filtered = useMemo(
    () =>
      codes.filter((d) => {
        if (activeFilter === "active" && !d.active) return false;
        if (activeFilter === "inactive" && d.active) return false;
        return true;
      }),
    [codes, activeFilter]
  );

  const stats = useMemo(() => {
    const totalUses = codes.reduce((sum, d) => sum + d.usedCount, 0);
    const avgPercent = codes.length ? codes.reduce((sum, d) => sum + d.percent, 0) / codes.length : 0;
    return {
      active: codes.filter((d) => d.active).length,
      totalUses,
      avgPercent,
    };
  }, [codes]);

  const toggleActive = (d: DiscountCode) => {
    upsertDiscountCode({ ...d, active: !d.active });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: d.active ? "غیرفعال‌سازی کد تخفیف" : "فعال‌سازی کد تخفیف",
      target: d.code,
    });
    toast.success(d.active ? `کد ${toFa(d.code)} غیرفعال شد` : `کد ${toFa(d.code)} فعال شد`);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteDiscountCode(deleteTarget.id);
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: "حذف کد تخفیف",
      target: deleteTarget.code,
    });
    toast.success(`کد ${toFa(deleteTarget.code)} حذف شد`);
    setDeleteTarget(null);
  };

  const columns: ColumnDef<DiscountCode>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span dir="ltr" className="font-mono text-sm font-semibold tracking-wide">
            {row.original.code}
          </span>
          {isPastISO(row.original.expiresAtISO) && (
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400">
              منقضی‌شده
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "percent",
      header: "درصد",
      cell: ({ row }) => <span className="text-sm font-semibold tabular-nums">{faPercent(row.original.percent)}</span>,
    },
    {
      id: "usage",
      header: "استفاده / سقف",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {faNum(row.original.usedCount)} از {faNum(row.original.maxUses)}
        </span>
      ),
    },
    {
      accessorKey: "minAmount",
      header: "حداقل مبلغ",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.minAmount > 0 ? toman(row.original.minAmount) : "بدون محدودیت"}
        </span>
      ),
    },
    {
      accessorKey: "expiresAtISO",
      header: "انقضا",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{faDateShort(row.original.expiresAtISO)}</span>,
    },
    {
      accessorKey: "active",
      header: "فعال",
      cell: ({ row }) => (
        <Switch
          checked={row.original.active}
          onCheckedChange={() => toggleActive(row.original)}
          aria-label={`${row.original.active ? "غیرفعال‌سازی" : "فعال‌سازی"} کد ${row.original.code}`}
        />
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => {
        const d = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`عملیات کد ${d.code}`}>
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>عملیات کد</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(d);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-4" aria-hidden />
                  ویرایش
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(d)}>
                  <Trash2 className="size-4" aria-hidden />
                  حذف
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
        title="کدهای تخفیف"
        description={`${faNum(codes.length)} کد ثبت‌شده — ${faNum(stats.active)} فعال، ${faNum(codes.length - stats.active)} غیرفعال`}
        loading={loading}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            افزودن کد تخفیف
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار کدهای تخفیف">
        <StatCard
          title="کدهای فعال"
          value={faNum(stats.active)}
          hint={`از ${faNum(codes.length)} کد ثبت‌شده`}
          icon={TicketCheck}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="مجموع استفاده"
          value={faNum(stats.totalUses)}
          hint="مجموع استفاده از همه کدها"
          icon={TicketPercent}
          tone="sky"
          loading={loading}
        />
        <StatCard
          title="میانگین درصد تخفیف"
          value={faPercent(Math.round(stats.avgPercent))}
          hint="میانگین همه کدهای ثبت‌شده"
          icon={BadgePercent}
          tone="violet"
          loading={loading}
        />
      </section>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchPlaceholder="جستجوی کد تخفیف…"
        emptyTitle="کد تخفیفی یافت نشد"
        emptyDescription="با تغییر فیلترها جستجو کنید یا کد جدیدی ثبت کنید."
        emptyIcon={TicketPercent}
        exportCsvName="کدهای تخفیف"
        csvRows={(d) => ({
          "کد": d.code,
          "درصد": d.percent,
          "استفاده‌شده": d.usedCount,
          "سقف": d.maxUses,
          "حداقل مبلغ (تومان)": d.minAmount,
          "انقضا": faDateShort(d.expiresAtISO),
          "وضعیت": d.active ? "فعال" : "غیرفعال",
        })}
        toolbar={
          <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveFilter)}>
            <SelectTrigger className="h-9 w-36" aria-label="فیلتر وضعیت فعال">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه کدها</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        }
        mobileCard={(d) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <span dir="ltr" className="font-mono text-sm font-semibold tracking-wide">
                {d.code}
              </span>
              <Switch
                checked={d.active}
                onCheckedChange={() => toggleActive(d)}
                aria-label={`${d.active ? "غیرفعال‌سازی" : "فعال‌سازی"} کد ${d.code}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="tabular-nums">{faPercent(d.percent)}</Badge>
              <span className="tabular-nums">
                {faNum(d.usedCount)} از {faNum(d.maxUses)} استفاده
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {d.minAmount > 0 ? `حداقل ${toman(d.minAmount)}` : "بدون حداقل مبلغ"} • انقضا {faDateShort(d.expiresAtISO)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setEditing(d);
                  setDialogOpen(true);
                }}
              >
                ویرایش
              </Button>
            </div>
          </div>
        )}
      />

      <DiscountDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} actorName={actorName} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" aria-hidden />
              حذف کد تخفیف
            </AlertDialogTitle>
            <AlertDialogDescription>
              کد <span dir="ltr" className="font-mono font-semibold">{deleteTarget?.code}</span> برای همیشه حذف شود؟
              این اقدام قابل بازگشت نیست.
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
