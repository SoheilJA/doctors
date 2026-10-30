"use client";

/**
 * /admin/centers — مراکز درمانی و آزمایشگاه‌ها: تب‌های نوع، فعال/غیرفعال‌سازی،
 * افزودن/ویرایش با اعتبارسنجی زود (Persian zod) و حذف با تأیید.
 */

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Home, MapPin, MoreHorizontal, Pencil, Phone, Plus, Trash2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { CITIES } from "@/lib/constants";
import { faNum, faPhone, toEnDigits } from "@/lib/fa";
import { CENTER_TYPE_LABELS, useAdminPanel } from "@/features/admin/shared";
import type { MedicalCenter } from "@/types";

const ALL = "all";
type CenterTypeFilter = typeof ALL | MedicalCenter["type"];

const centerSchema = z.object({
  name: z.string().trim().min(3, "نام مرکز را وارد کنید"),
  type: z.enum(["clinic", "lab", "hospital"], { message: "نوع مرکز را انتخاب کنید" }),
  city: z.string().min(1, "شهر مرکز را انتخاب کنید"),
  address: z.string().trim().min(5, "آدرس مرکز را وارد کنید"),
  phone: z
    .string()
    .regex(/^0\d{10}$/, "شماره تماس معتبر نیست (۱۱ رقم و با ۰ شروع شود)"),
  homeSampling: z.boolean(),
});
type CenterValues = z.infer<typeof centerSchema>;

export function AdminCentersManager() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const upsertCenter = useAppStore((s) => s.upsertCenter);
  const deleteCenter = useAppStore((s) => s.deleteCenter);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  const [typeFilter, setTypeFilter] = useState<CenterTypeFilter>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MedicalCenter | null>(null);
  const [deleting, setDeleting] = useState<MedicalCenter | null>(null);

  const filtered = useMemo(
    () => (typeFilter === ALL ? panel.centers : panel.centers.filter((c) => c.type === typeFilter)),
    [panel.centers, typeFilter]
  );

  /* -------------------------------- dialog -------------------------------- */

  const form = useForm<CenterValues>({
    resolver: zodResolver(centerSchema),
    defaultValues: { name: "", type: "clinic", city: "", address: "", phone: "", homeSampling: false },
  });
  const watchedType = useWatch({ control: form.control, name: "type" });

  useEffect(() => {
    if (!dialogOpen) return;
    form.reset(
      editing
        ? {
            name: editing.name,
            type: editing.type,
            city: editing.city,
            address: editing.address,
            phone: editing.phone,
            homeSampling: editing.homeSampling ?? false,
          }
        : { name: "", type: "clinic", city: "", address: "", phone: "", homeSampling: false }
    );
  }, [dialogOpen, editing, form]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: MedicalCenter) => {
    setEditing(c);
    setDialogOpen(true);
  };

  const submit = form.handleSubmit((values) => {
    const homeSampling = values.type === "lab" ? values.homeSampling : false;
    const record: MedicalCenter = editing
      ? { ...editing, ...values, homeSampling }
      : {
          id: `ctr-${Date.now()}`,
          ...values,
          homeSampling,
          active: true,
        };
    upsertCenter(record);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: editing ? "ویرایش مرکز درمانی" : "افزودن مرکز درمانی",
      target: record.name,
    });
    toast.success(editing ? "مرکز درمانی ویرایش شد" : "مرکز درمانی ثبت شد", {
      description: `${record.name} — ${CENTER_TYPE_LABELS[record.type]}، ${record.city}`,
    });
    setDialogOpen(false);
  });

  const toggleActive = (c: MedicalCenter) => {
    upsertCenter({ ...c, active: !c.active });
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: c.active ? "غیرفعال‌سازی مرکز درمانی" : "فعال‌سازی مرکز درمانی",
      target: c.name,
    });
    toast(c.active ? `«${c.name}» غیرفعال شد` : `«${c.name}» فعال شد`);
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteCenter(deleting.id);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: "حذف مرکز درمانی",
      target: deleting.name,
    });
    toast.error(`مرکز «${deleting.name}» حذف شد`);
    setDeleting(null);
  };

  /* -------------------------------- columns -------------------------------- */

  const columns: ColumnDef<MedicalCenter>[] = [
    {
      accessorKey: "name",
      header: "نام مرکز",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-muted p-2 text-muted-foreground">
            <Building2 className="size-4" aria-hidden />
          </div>
          <span className="max-w-52 truncate text-sm font-medium">{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "نوع",
      cell: ({ row }) => (
        <Badge variant={row.original.type === "lab" ? "secondary" : "outline"}>
          {CENTER_TYPE_LABELS[row.original.type]}
        </Badge>
      ),
    },
    {
      accessorKey: "city",
      header: "شهر",
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {row.original.city}
        </span>
      ),
    },
    {
      accessorKey: "phone",
      header: "تلفن",
      cell: ({ row }) => (
        <span className="flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
          <Phone className="size-3.5" aria-hidden />
          {faPhone(row.original.phone)}
        </span>
      ),
    },
    {
      id: "homeSampling",
      header: "نمونه‌گیری در منزل",
      cell: ({ row }) =>
        row.original.type === "lab" ? (
          row.original.homeSampling ? (
            <Badge className="gap-1 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
              <Home className="size-3" aria-hidden />
              دارد
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">ندارد</span>
          )
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "active",
      header: "فعال",
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={row.original.active}
            onCheckedChange={() => toggleActive(row.original)}
            aria-label={`${row.original.active ? "غیرفعال‌سازی" : "فعال‌سازی"} ${row.original.name}`}
          />
        </div>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={`عملیات ${row.original.name}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <Pencil className="size-4" aria-hidden />
                ویرایش
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(row.original)}>
                <Trash2 className="size-4" aria-hidden />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const typeCounts = useMemo(
    () => ({
      clinic: panel.centers.filter((c) => c.type === "clinic").length,
      lab: panel.centers.filter((c) => c.type === "lab").length,
      hospital: panel.centers.filter((c) => c.type === "hospital").length,
    }),
    [panel.centers]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="مراکز درمانی و آزمایشگاه‌ها"
        description={`${faNum(panel.centers.length)} مرکز — ${faNum(typeCounts.clinic)} درمانگاه، ${faNum(typeCounts.lab)} آزمایشگاه، ${faNum(typeCounts.hospital)} بیمارستان`}
        loading={loading}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            افزودن مرکز
          </Button>
        }
      />

      <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as CenterTypeFilter)}>
        <TabsList>
          <TabsTrigger value={ALL}>همه</TabsTrigger>
          <TabsTrigger value="clinic">درمانگاه</TabsTrigger>
          <TabsTrigger value="lab">آزمایشگاه</TabsTrigger>
          <TabsTrigger value="hospital">بیمارستان</TabsTrigger>
        </TabsList>
      </Tabs>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchable
        searchPlaceholder="جستجوی نام مرکز…"
        emptyTitle="مرکزی یافت نشد"
        emptyDescription="مرکز جدیدی اضافه کنید یا فیلتر را تغییر دهید."
        emptyIcon={Building2}
        exportCsvName="مراکز-درمانی"
        csvRows={(c) => ({
          "نام": c.name,
          "نوع": CENTER_TYPE_LABELS[c.type],
          "شهر": c.city,
          "تلفن": faPhone(c.phone),
          "نمونه‌گیری در منزل": c.type === "lab" ? (c.homeSampling ? "دارد" : "ندارد") : "—",
          "وضعیت": c.active ? "فعال" : "غیرفعال",
          "آدرس": c.address,
        })}
        mobileCard={(c) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {CENTER_TYPE_LABELS[c.type]} — {c.city}
                </p>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Switch
                  checked={c.active}
                  onCheckedChange={() => toggleActive(c)}
                  aria-label={`${c.active ? "غیرفعال‌سازی" : "فعال‌سازی"} ${c.name}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">{faPhone(c.phone)}</span>
              {c.type === "lab" && (
                <Badge variant="outline" className="text-[10px]">
                  {c.homeSampling ? "نمونه‌گیری در منزل" : "بدون نمونه‌گیری"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => openEdit(c)}>
                <Pencil className="size-3.5" aria-hidden />
                ویرایش
              </Button>
              <Button variant="outline" size="sm" className="h-7 flex-1 text-xs text-rose-600" onClick={() => setDeleting(c)}>
                <Trash2 className="size-3.5" aria-hidden />
                حذف
              </Button>
            </div>
          </div>
        )}
      />

      {/* create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-primary" aria-hidden />
              {editing ? `ویرایش «${editing.name}»` : "افزودن مرکز درمانی"}
            </DialogTitle>
            <DialogDescription>اطلاعات مرکز را وارد کنید؛ مراکز فعال در بخش آزمایش کاربران نمایش داده می‌شوند.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={submit} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام مرکز</FormLabel>
                    <FormControl>
                      <Input placeholder="مثلاً: کلینیک تخصصی آرامش" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نوع مرکز</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger aria-label="انتخاب نوع مرکز">
                            <SelectValue placeholder="انتخاب…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(CENTER_TYPE_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شهر</FormLabel>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger aria-label="انتخاب شهر">
                            <SelectValue placeholder="انتخاب…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CITIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>آدرس</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="خیابان، کوچه، پلاک…" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تلفن تماس</FormLabel>
                    <FormControl>
                      <Input
                        dir="ltr"
                        inputMode="tel"
                        value={field.value}
                        onChange={(e) => field.onChange(toEnDigits(e.target.value).replace(/\D/g, ""))}
                        placeholder="02112345678"
                        className="text-start tabular-nums"
                        aria-label="تلفن تماس مرکز"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchedType === "lab" && (
                <FormField
                  control={form.control}
                  name="homeSampling"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-sm">
                          <Home className="size-4 text-primary" aria-hidden />
                          نمونه‌گیری در منزل
                        </FormLabel>
                        <FormDescription className="text-[11px]">برای آزمایشگاه‌های دارای خدمات سیار</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="نمونه‌گیری در منزل" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">{editing ? "ذخیره تغییرات" : "ثبت مرکز"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <AlertDialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مرکز درمانی</AlertDialogTitle>
            <AlertDialogDescription>
              مرکز «{deleting?.name ?? ""}» حذف شود؟ این اقدام قابل بازگشت نیست.
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
