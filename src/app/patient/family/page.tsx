"use client";

/**
 * اعضای خانواده — کارت‌های اعضا با افزودن، ویرایش و حذف.
 */

import { useMemo, useState } from "react";
import { Info, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toFa } from "@/lib/fa";
import { jalaliParts } from "@/lib/jalali";
import type { FamilyMember } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { FamilyFormDialog } from "@/features/patient/family/family-form-dialog";
import { GENDER_LABELS, useCurrentPatient } from "@/features/patient/helpers";

export default function FamilyPage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const addFamilyMember = useAppStore((s) => s.addFamilyMember);
  const updateFamilyMember = useAppStore((s) => s.updateFamilyMember);
  const removeFamilyMember = useAppStore((s) => s.removeFamilyMember);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [deleting, setDeleting] = useState<FamilyMember | null>(null);

  const family = useMemo(() => patient?.family ?? [], [patient]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (member: FamilyMember) => {
    setEditing(member);
    setDialogOpen(true);
  };

  const submit = (values: Omit<FamilyMember, "id">) => {
    if (!patient) return;
    if (editing) {
      updateFamilyMember(patient.id, editing.id, values);
      toast.success("اطلاعات عضو خانواده به‌روزرسانی شد");
    } else {
      addFamilyMember(patient.id, values);
      toast.success("عضو خانواده اضافه شد", { description: `«${values.name}» — برای رزرو نوبت در دسترس است.` });
    }
    setDialogOpen(false);
    setEditing(null);
  };

  const confirmDelete = () => {
    if (!patient || !deleting) return;
    removeFamilyMember(patient.id, deleting.id);
    toast.success("عضو خانواده حذف شد");
    setDeleting(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="اعضای خانواده"
        description="اعضای خانواده خود را مدیریت کنید و برای آن‌ها نوبت رزرو کنید."
        loading={loading}
        actions={
          <Button size="sm" disabled={!patient} onClick={openNew}>
            <Plus className="size-4" aria-hidden />
            افزودن عضو
          </Button>
        }
      />

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex items-start gap-2.5 p-4 text-sm">
          <Info className="mt-0.5 size-4.5 shrink-0 text-primary" aria-hidden />
          <p className="leading-relaxed">
            <b>نکته:</b> برای رزرو نوبت برای اعضای خانواده، هنگام رزرو آن‌ها را در مرحله «مشخصات متقاضی» انتخاب کنید.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : family.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {family.map((member) => (
            <Card key={member.id} className="transition-all hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <UsersRound className="size-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {GENDER_LABELS[member.gender]} • متولد {toFa(jalaliParts(member.birthDateISO).jy)}
                    </p>
                  </div>
                  <Badge variant="secondary">{member.relation}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">کد ملی</span>
                  <span className="font-semibold tabular-nums">{toFa(member.nationalId)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => openEdit(member)}>
                    <Pencil className="size-3.5" aria-hidden />
                    ویرایش
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-rose-600 hover:text-rose-700"
                    onClick={() => setDeleting(member)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={UsersRound}
          title="هنوز عضو خانواده‌ای ثبت نکرده‌اید"
          description="با افزودن اعضای خانواده، فرایند رزرو نوبت برای آن‌ها سریع‌تر می‌شود."
          action={
            <Button size="sm" onClick={openNew}>
              <Plus className="size-4" aria-hidden />
              افزودن عضو
            </Button>
          }
        />
      )}

      <FamilyFormDialog open={dialogOpen} onOpenChange={setDialogOpen} member={editing} onSubmit={submit} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف «{deleting?.name}»؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عضو از فهرست خانواده حذف می‌شود؛ نوبت‌های قبلی او در سوابق باقی می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={confirmDelete}>
              بله، حذف کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
