"use client";

/**
 * مشاوره‌های من — فهرست گفتگوها + پنل گفتگو (موبایل: دیالوگ).
 */

import { useMemo, useState } from "react";
import { MessagesSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toman } from "@/lib/fa";
import { faFromNow } from "@/lib/jalali";
import { CONSULTATION_STATUS_LABELS } from "@/lib/constants";
import type { Consultation } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { ConsultationThreadPanel } from "@/features/patient/consultations/consultation-thread";
import { NewConsultationDialog, type NewConsultationPayload } from "@/features/patient/consultations/new-consultation-dialog";
import { useCurrentPatient, useIsDesktop } from "@/features/patient/helpers";

export default function MyConsultationsPage() {
  const loading = useDemoLoading();
  const isDesktop = useIsDesktop();
  const patient = useCurrentPatient();
  const doctors = useAppStore((s) => s.doctors);
  const consultations = useAppStore((s) => s.consultations);
  const createConsultation = useAppStore((s) => s.createConsultation);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mine = useMemo(
    () =>
      consultations
        .filter((c) => c.patientId === patient?.id)
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)),
    [consultations, patient?.id]
  );

  const onlineDoctors = useMemo(
    () => doctors.filter((d) => d.availableOnline && d.accountStatus === "active"),
    [doctors]
  );

  const selected = mine.find((c) => c.id === selectedId) ?? mine[0] ?? null;
  const selectedDoctor = selected ? doctors.find((d) => d.id === selected.doctorId) : undefined;

  const select = (id: string) => {
    setSelectedId(id);
    if (!isDesktop) setMobileOpen(true);
  };

  const handleCreated = (payload: NewConsultationPayload) => {
    if (!patient) return;
    const { consultation } = createConsultation({
      doctorId: payload.doctorId,
      patientId: patient.id,
      type: payload.type,
      subject: payload.subject,
      question: payload.question,
    });
    setNewOpen(false);
    setSelectedId(consultation.id);
    toast.success("مشاوره ثبت شد و پرداخت انجام شد", {
      description: `${payload.doctor.name} حداکثر تا ۲۴ ساعت آینده پاسخ می‌دهد؛ مبلغ ${toman(
        payload.type === "text" ? payload.doctor.textFee : payload.type === "phone" ? payload.doctor.phoneFee : payload.doctor.videoFee
      )} کسر شد.`,
    });
  };

  const listPanel = (
    <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto lg:pe-1">
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
      ) : mine.length ? (
        mine.map((c) => {
          const doc = doctors.find((d) => d.id === c.doctorId);
          const active = selected?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors",
                active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
            >
              <UserAvatar name={doc?.name ?? "?"} hue={doc?.avatarHue ?? 200} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{c.subject}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {doc?.name} • {faFromNow(c.createdAtISO)}
                </span>
              </span>
              <StatusBadge status={c.status} label={CONSULTATION_STATUS_LABELS[c.status].replace("در انتظار پاسخ پزشک", "در انتظار")} />
            </button>
          );
        })
      ) : (
        <EmptyState
          icon={MessagesSquare}
          title="هنوز مشاوره‌ای ثبت نکرده‌اید"
          description="سؤال پزشکی خود را آنلاین بپرسید؛ پاسخ در کمتر از ۲۴ ساعت دریافت می‌کنید."
          action={
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" aria-hidden />
              مشاوره جدید
            </Button>
          }
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="مشاوره‌های من"
        description="گفتگوهای متنی، تلفنی و ویدیویی با پزشکان."
        loading={loading}
        actions={
          <Button size="sm" disabled={!patient} onClick={() => setNewOpen(true)}>
            <Plus className="size-4" aria-hidden />
            مشاوره جدید
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : mine.length ? (
        <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
          {/* list */}
          {listPanel}
          {/* thread (desktop) */}
          {selected && selectedDoctor ? (
            <div className="hidden lg:block">
              <ConsultationThreadPanel consultation={selected} doctor={selectedDoctor} />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* thread (mobile dialog) */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:hidden">
          <DialogTitle className="sr-only">گفتگوی مشاوره</DialogTitle>
          {selected && selectedDoctor ? (
            <ConsultationThreadPanel consultation={selected} doctor={selectedDoctor} className="border-0 shadow-none" />
          ) : null}
        </DialogContent>
      </Dialog>

      <NewConsultationDialog open={newOpen} onOpenChange={setNewOpen} doctors={onlineDoctors} onCreated={handleCreated} />
    </div>
  );
}
