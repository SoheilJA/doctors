"use client";

/**
 * /admin/services — خدمات و تخصص‌ها: تب تخصص‌ها (افزودن/ویرایش/حذف با محافظت
 * در صورت وجود پزشک) و تب خدمات درمانگاهی (CRUD با بازه قیمت).
 */

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Layers, MoreHorizontal, Pencil, Plus, Sparkles, Stethoscope, Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { faNum, parseFaNumber } from "@/lib/fa";
import { specialtyTitle, useAdminPanel } from "@/features/admin/shared";
import type { ClinicServiceItem, Specialty } from "@/lib/constants";

export function AdminServicesManager() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const upsertSpecialty = useAppStore((s) => s.upsertSpecialty);
  const deleteSpecialty = useAppStore((s) => s.deleteSpecialty);
  const upsertService = useAppStore((s) => s.upsertService);
  const deleteService = useAppStore((s) => s.deleteService);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  /* ------------------------------ specialties ------------------------------ */

  const doctorCountBySpecialty = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of panel.doctors) m.set(d.specialtyId, (m.get(d.specialtyId) ?? 0) + 1);
    return m;
  }, [panel.doctors]);

  const [spcDialogOpen, setSpcDialogOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [deletingSpecialty, setDeletingSpecialty] = useState<Specialty | null>(null);

  const specialtySchema = useMemo(
    () =>
      z.object({
        title: z.string().trim().min(2, "عنوان تخصص الزامی است"),
        description: z.string().trim().min(10, "توضیح تخصص را کامل‌تر بنویسید (حداقل ۱۰ نویسه)"),
      }),
    []
  );
  type SpecialtyValues = z.infer<typeof specialtySchema>;

  const spcForm = useForm<SpecialtyValues>({
    resolver: zodResolver(specialtySchema),
    defaultValues: { title: "", description: "" },
  });

  useEffect(() => {
    if (!spcDialogOpen) return;
    spcForm.reset(
      editingSpecialty
        ? { title: editingSpecialty.title, description: editingSpecialty.description }
        : { title: "", description: "" }
    );
  }, [spcDialogOpen, editingSpecialty, spcForm]);

  const submitSpecialty = spcForm.handleSubmit((values) => {
    const record: Specialty = editingSpecialty
      ? { ...editingSpecialty, ...values }
      : { id: `spc-${Date.now()}`, ...values };
    upsertSpecialty(record);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: editingSpecialty ? "ویرایش تخصص" : "افزودن تخصص",
      target: record.title,
    });
    toast.success(editingSpecialty ? "تخصص ویرایش شد" : "تخصص جدید ثبت شد", { description: record.title });
    setSpcDialogOpen(false);
  });

  const confirmDeleteSpecialty = () => {
    if (!deletingSpecialty) return;
    const count = doctorCountBySpecialty.get(deletingSpecialty.id) ?? 0;
    if (count > 0) {
      toast.error("ابتدا پزشکان این تخصص را منتقل کنید", {
        description: `${faNum(count)} پزشک به تخصص «${deletingSpecialty.title}» متصل است.`,
      });
      setDeletingSpecialty(null);
      return;
    }
    deleteSpecialty(deletingSpecialty.id);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: "حذف تخصص",
      target: deletingSpecialty.title,
    });
    toast.error(`تخصص «${deletingSpecialty.title}» حذف شد`);
    setDeletingSpecialty(null);
  };

  const specialtyColumns: ColumnDef<Specialty>[] = [
    {
      accessorKey: "title",
      header: "عنوان",
      cell: ({ row }) => (
        <span className="flex items-center gap-2 text-sm font-medium">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Stethoscope className="size-4" aria-hidden />
          </div>
          {row.original.title}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "توضیح",
      cell: ({ row }) => (
        <span className="block max-w-72 truncate text-sm text-muted-foreground">{row.original.description}</span>
      ),
    },
    {
      id: "doctors",
      header: "تعداد پزشکان",
      cell: ({ row }) => (
        <Badge variant="secondary" className="tabular-nums">
          {faNum(doctorCountBySpecialty.get(row.original.id) ?? 0)} پزشک
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={`عملیات ${row.original.title}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingSpecialty(row.original);
                  setSpcDialogOpen(true);
                }}
              >
                <Pencil className="size-4" aria-hidden />
                ویرایش
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeletingSpecialty(row.original)}>
                <Trash2 className="size-4" aria-hidden />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  /* -------------------------------- services -------------------------------- */

  const [svcDialogOpen, setSvcDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<ClinicServiceItem | null>(null);
  const [deletingService, setDeletingService] = useState<ClinicServiceItem | null>(null);

  const serviceSchema = useMemo(
    () =>
      z
        .object({
          title: z.string().trim().min(2, "نام خدمت الزامی است"),
          specialtyId: z.string().min(1, "تخصص مرتبط را انتخاب کنید"),
          priceMin: z.number({ message: "قیمت معتبر نیست" }).min(0, "قیمت معتبر نیست"),
          priceMax: z.number({ message: "قیمت معتبر نیست" }).min(0, "قیمت معتبر نیست"),
        })
        .refine((v) => v.priceMax >= v.priceMin, {
          path: ["priceMax"],
          message: "قیمت پایان نباید کمتر از قیمت شروع باشد",
        }),
    []
  );
  type ServiceValues = z.infer<typeof serviceSchema>;

  const svcForm = useForm<ServiceValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { title: "", specialtyId: "", priceMin: 0, priceMax: 0 },
  });

  useEffect(() => {
    if (!svcDialogOpen) return;
    svcForm.reset(
      editingService
        ? {
            title: editingService.title,
            specialtyId: editingService.specialtyId,
            priceMin: editingService.priceMin,
            priceMax: editingService.priceMax,
          }
        : { title: "", specialtyId: "", priceMin: 0, priceMax: 0 }
    );
  }, [svcDialogOpen, editingService, svcForm]);

  const submitService = svcForm.handleSubmit((values) => {
    const record: ClinicServiceItem = editingService
      ? { ...editingService, ...values }
      : { id: `svc-${Date.now()}`, ...values };
    upsertService(record);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: editingService ? "ویرایش خدمت درمانگاهی" : "افزودن خدمت درمانگاهی",
      target: record.title,
    });
    toast.success(editingService ? "خدمت ویرایش شد" : "خدمت جدید ثبت شد", {
      description: `${record.title} — ${specialtyTitle(record.specialtyId, panel.specialties)}`,
    });
    setSvcDialogOpen(false);
  });

  const confirmDeleteService = () => {
    if (!deletingService) return;
    deleteService(deletingService.id);
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: "حذف خدمت درمانگاهی",
      target: deletingService.title,
    });
    toast.error(`خدمت «${deletingService.title}» حذف شد`);
    setDeletingService(null);
  };

  const serviceColumns: ColumnDef<ClinicServiceItem>[] = [
    {
      accessorKey: "title",
      header: "نام خدمت",
      cell: ({ row }) => (
        <span className="flex items-center gap-2 text-sm font-medium">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </div>
          {row.original.title}
        </span>
      ),
    },
    {
      id: "specialty",
      header: "تخصص مرتبط",
      cell: ({ row }) => (
        <Badge variant="outline">{specialtyTitle(row.original.specialtyId, panel.specialties)}</Badge>
      ),
    },
    {
      id: "range",
      header: "بازه قیمت",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          از {faNum(row.original.priceMin)} تا {faNum(row.original.priceMax)} تومان
        </span>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={`عملیات ${row.original.title}`}>
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingService(row.original);
                  setSvcDialogOpen(true);
                }}
              >
                <Pencil className="size-4" aria-hidden />
                ویرایش
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setDeletingService(row.original)}>
                <Trash2 className="size-4" aria-hidden />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="خدمات و تخصص‌ها"
        description={`${faNum(panel.specialties.length)} تخصص و ${faNum(panel.services.length)} خدمت درمانگاهی`}
        loading={loading}
      />

      <Tabs defaultValue="specialties">
        <TabsList>
          <TabsTrigger value="specialties">تخصص‌ها</TabsTrigger>
          <TabsTrigger value="services">خدمات درمانگاهی</TabsTrigger>
        </TabsList>

        <TabsContent value="specialties" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingSpecialty(null);
                setSpcDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              افزودن تخصص
            </Button>
          </div>
          <DataTable
            columns={specialtyColumns}
            data={panel.specialties}
            loading={loading}
            searchable
            searchPlaceholder="جستجوی تخصص…"
            emptyTitle="تخصصی ثبت نشده است"
            emptyDescription="تخصص جدیدی اضافه کنید."
            emptyIcon={Stethoscope}
            exportCsvName="تخصص-ها"
            csvRows={(s) => ({
              "عنوان": s.title,
              "توضیح": s.description,
              "تعداد پزشکان": doctorCountBySpecialty.get(s.id) ?? 0,
            })}
            mobileCard={(s) => (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{s.title}</p>
                  <Badge variant="secondary" className="tabular-nums">
                    {faNum(doctorCountBySpecialty.get(s.id) ?? 0)} پزشک
                  </Badge>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{s.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={() => {
                      setEditingSpecialty(s);
                      setSpcDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    ویرایش
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs text-rose-600"
                    onClick={() => setDeletingSpecialty(s)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    حذف
                  </Button>
                </div>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="services" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingService(null);
                setSvcDialogOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden />
              افزودن خدمت
            </Button>
          </div>
          <DataTable
            columns={serviceColumns}
            data={panel.services}
            loading={loading}
            searchable
            searchPlaceholder="جستجوی خدمت…"
            emptyTitle="خدمتی ثبت نشده است"
            emptyDescription="خدمت درمانگاهی جدیدی اضافه کنید."
            emptyIcon={Sparkles}
            exportCsvName="خدمات-درمانگاهی"
            csvRows={(s) => ({
              "نام": s.title,
              "تخصص": specialtyTitle(s.specialtyId, panel.specialties),
              "قیمت از (تومان)": s.priceMin,
              "قیمت تا (تومان)": s.priceMax,
            })}
            mobileCard={(s) => (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{s.title}</p>
                  <Badge variant="outline">{specialtyTitle(s.specialtyId, panel.specialties)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground tabular-nums">
                  از {faNum(s.priceMin)} تا {faNum(s.priceMax)} تومان
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs"
                    onClick={() => {
                      setEditingService(s);
                      setSvcDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    ویرایش
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 flex-1 text-xs text-rose-600"
                    onClick={() => setDeletingService(s)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    حذف
                  </Button>
                </div>
              </div>
            )}
          />
        </TabsContent>
      </Tabs>

      {/* specialty dialog */}
      <Dialog open={spcDialogOpen} onOpenChange={setSpcDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="size-5 text-primary" aria-hidden />
              {editingSpecialty ? `ویرایش «${editingSpecialty.title}»` : "افزودن تخصص"}
            </DialogTitle>
            <DialogDescription>تخصص‌ها در جستجوی پزشکان و دسته‌بندی خدمات استفاده می‌شوند.</DialogDescription>
          </DialogHeader>
          <Form {...spcForm}>
            <form onSubmit={submitSpecialty} className="space-y-4">
              <FormField
                control={spcForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان تخصص</FormLabel>
                    <FormControl>
                      <Input placeholder="مثلاً: فیزیوتراپی" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={spcForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>توضیح</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="دامنه خدمات این تخصص…" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSpcDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">{editingSpecialty ? "ذخیره تغییرات" : "ثبت تخصص"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* service dialog */}
      <Dialog open={svcDialogOpen} onOpenChange={setSvcDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" aria-hidden />
              {editingService ? `ویرایش «${editingService.title}»` : "افزودن خدمت درمانگاهی"}
            </DialogTitle>
            <DialogDescription>خدمات درمانگاهی با بازه قیمت در پروفایل پزشکان نمایش داده می‌شوند.</DialogDescription>
          </DialogHeader>
          <Form {...svcForm}>
            <form onSubmit={submitService} className="space-y-4">
              <FormField
                control={svcForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام خدمت</FormLabel>
                    <FormControl>
                      <Input placeholder="مثلاً: بوتاکس پیشانی" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={svcForm.control}
                name="specialtyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تخصص مرتبط</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="انتخاب تخصص مرتبط">
                          <SelectValue placeholder="انتخاب…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {panel.specialties.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={svcForm.control}
                  name="priceMin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>قیمت از (تومان)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          value={field.value ? faNum(field.value) : ""}
                          onChange={(e) => {
                            const n = parseFaNumber(e.target.value);
                            field.onChange(Number.isFinite(n) ? n : Number.NaN);
                          }}
                          placeholder="۵۰۰٬۰۰۰"
                          className="tabular-nums"
                          aria-label="قیمت شروع به تومان"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={svcForm.control}
                  name="priceMax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>قیمت تا (تومان)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          value={field.value ? faNum(field.value) : ""}
                          onChange={(e) => {
                            const n = parseFaNumber(e.target.value);
                            field.onChange(Number.isFinite(n) ? n : Number.NaN);
                          }}
                          placeholder="۲٬۰۰۰٬۰۰۰"
                          className="tabular-nums"
                          aria-label="قیمت پایان به تومان"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSvcDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">{editingService ? "ذخیره تغییرات" : "ثبت خدمت"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* delete confirms */}
      <AlertDialog open={deletingSpecialty !== null} onOpenChange={(v) => !v && setDeletingSpecialty(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف تخصص</AlertDialogTitle>
            <AlertDialogDescription>
              تخصص «{deletingSpecialty?.title ?? ""}» حذف شود؟ در صورت وجود پزشک در این تخصص، حذف انجام نمی‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDeleteSpecialty}>
              بله، حذف شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deletingService !== null} onOpenChange={(v) => !v && setDeletingService(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف خدمت درمانگاهی</AlertDialogTitle>
            <AlertDialogDescription>
              خدمت «{deletingService?.title ?? ""}» حذف شود؟ این اقدام قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDeleteService}>
              بله، حذف شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
