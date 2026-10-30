"use client";

/**
 * /support/canned — manage canned replies used in the ticket composer.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { faNum } from "@/lib/fa";
import type { CannedReply } from "@/types";

const cannedSchema = z.object({
  title: z.string().trim().min(3, "عنوان حداقل ۳ حرف باشد"),
  text: z.string().trim().min(10, "متن پاسخ حداقل ۱۰ حرف باشد"),
});
type CannedForm = z.infer<typeof cannedSchema>;

export function CannedRepliesManager() {
  const loading = useDemoLoading();
  const cannedReplies = useAppStore((s) => s.cannedReplies);
  const upsertCannedReply = useAppStore((s) => s.upsertCannedReply);
  const deleteCannedReply = useAppStore((s) => s.deleteCannedReply);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CannedReply | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CannedReply | null>(null);

  const form = useForm<CannedForm>({
    resolver: zodResolver(cannedSchema),
    defaultValues: { title: "", text: "" },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ title: "", text: "" });
    setDialogOpen(true);
  };

  const openEdit = (reply: CannedReply) => {
    setEditing(reply);
    form.reset({ title: reply.title, text: reply.text });
    setDialogOpen(true);
  };

  const submit = (values: CannedForm) => {
    upsertCannedReply({
      id: editing?.id ?? `canned-${Date.now()}`,
      title: values.title,
      text: values.text,
    });
    setDialogOpen(false);
    toast.success(editing ? "پاسخ آماده ویرایش شد" : "پاسخ آماده جدید اضافه شد", {
      description: values.title,
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteCannedReply(deleteTarget.id);
    toast.success("پاسخ آماده حذف شد", { description: deleteTarget.title });
    setDeleteTarget(null);
  };

  const columns: ColumnDef<CannedReply>[] = [
    {
      accessorKey: "title",
      header: "عنوان",
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.title}</span>,
    },
    {
      accessorKey: "text",
      header: "متن پاسخ",
      enableSorting: false,
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground" title={row.original.text}>
          {row.original.text}
        </p>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(row.original)} aria-label={`ویرایش ${row.original.title}`}>
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-rose-500 hover:text-rose-600"
            onClick={() => setDeleteTarget(row.original)}
            aria-label={`حذف ${row.original.title}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="پاسخ‌های آماده"
        description={`پاسخ‌های آماده در پاسخ‌گویی تیکت‌ها در دسترس هستند. — ${faNum(cannedReplies.length)} پاسخ ثبت شده`}
        loading={loading}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            افزودن پاسخ آماده
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={cannedReplies}
        searchable
        searchPlaceholder="جستجوی عنوان یا متن…"
        loading={loading}
        emptyTitle="پاسخ آماده‌ای ثبت نشده است"
        emptyDescription="با افزودن پاسخ‌های آماده، پاسخ‌گویی به تیکت‌ها سریع‌تر می‌شود."
        emptyIcon={MessageSquareText}
        emptyAction={
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            افزودن اولین پاسخ آماده
          </Button>
        }
        mobileCard={(r) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{r.title}</p>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="icon" variant="ghost" className="size-8" onClick={() => openEdit(r)} aria-label={`ویرایش ${r.title}`}>
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-rose-500 hover:text-rose-600"
                  onClick={() => setDeleteTarget(r)}
                  aria-label={`حذف ${r.title}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{r.text}</p>
          </div>
        )}
      />

      {/* create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle>{editing ? "ویرایش پاسخ آماده" : "افزودن پاسخ آماده"}</DialogTitle>
            <DialogDescription>متن آماده در کامپونسر پاسخ تیکت قابل درج است.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-3 text-start">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">عنوان</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثلاً: راهنمای بازگشت وجه" className="h-9" aria-label="عنوان پاسخ آماده" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">متن پاسخ</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="متن کامل پاسخ…" className="min-h-28 text-sm" aria-label="متن پاسخ آماده" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">{editing ? "ذخیره تغییرات" : "افزودن"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>این پاسخ آماده حذف شود؟</AlertDialogTitle>
            <AlertDialogDescription>
              «{deleteTarget?.title}» حذف می‌شود و دیگر در پاسخ‌گویی تیکت‌ها قابل درج نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف شود</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
