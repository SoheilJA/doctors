"use client";

/**
 * آزمایش‌ها — فهرست سفارش‌ها با استپر وضعیت + سفارش جدید.
 */

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LabOrderTest } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { toFa, faNum } from "@/lib/fa";
import { NewLabOrderDialog } from "@/features/patient/labs/new-lab-order-dialog";
import { LabOrderCard } from "@/features/patient/labs/lab-order-card";
import { useCurrentPatient } from "@/features/patient/helpers";

export default function PatientLabsPage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const centers = useAppStore((s) => s.centers);
  const labOrders = useAppStore((s) => s.labOrders);
  const doctors = useAppStore((s) => s.doctors);
  const createLabOrder = useAppStore((s) => s.createLabOrder);

  const [newOpen, setNewOpen] = useState(false);

  const labs = useMemo(() => centers.filter((c) => c.type === "lab" && c.active), [centers]);
  const activeDoctors = useMemo(() => doctors.filter((d) => d.accountStatus === "active"), [doctors]);

  const mine = useMemo(
    () =>
      labOrders
        .filter((l) => l.patientId === patient?.id)
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)),
    [labOrders, patient?.id]
  );

  const handleCreated = (input: {
    labId: string;
    doctorId?: string;
    tests: LabOrderTest[];
    homeSampling: boolean;
    prescriptionFile?: { name: string; sizeKB: number; type: "pdf" };
  }) => {
    if (!patient) return;
    const order = createLabOrder({
      patientId: patient.id,
      labId: input.labId,
      doctorId: input.doctorId,
      tests: input.tests,
      homeSampling: input.homeSampling,
      prescriptionFile: input.prescriptionFile,
    });
    setNewOpen(false);
    toast.success(`سفارش با کد ${toFa(order.code)} ثبت شد`, {
      description: `${faNum(input.tests.length)} آزمایش — پس از تأیید آزمایشگاه، از دکمه «پرداخت» تسویه کنید.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="آزمایش‌ها"
        description="سفارش آزمایش، پیگیری مراحل و مشاهده جواب‌ها."
        loading={loading}
        actions={
          <Button size="sm" disabled={!patient} onClick={() => setNewOpen(true)}>
            <Plus className="size-4" aria-hidden />
            سفارش جدید
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : mine.length ? (
        <div className="space-y-4">
          {mine.map((order) => (
            <LabOrderCard key={order.id} order={order} lab={centers.find((c) => c.id === order.labId)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FlaskConical}
          title="سفارش آزمایشی ثبت نکرده‌اید"
          description="با انتخاب آزمایشگاه و آزمایش‌های موردنظر، سفارش خود را ثبت کنید؛ نمونه‌گیری در منزل هم امکان‌پذیر است."
          action={
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" aria-hidden />
              سفارش جدید
            </Button>
          }
        />
      )}

      {patient && (
        <NewLabOrderDialog
          open={newOpen}
          onOpenChange={setNewOpen}
          labs={labs}
          doctors={activeDoctors}
          patient={patient}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
