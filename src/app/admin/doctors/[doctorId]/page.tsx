"use client";

import { useParams } from "next/navigation";
import { AdminDoctorDetail } from "@/features/admin/doctors/detail";

export default function AdminDoctorDetailPage() {
  const params = useParams<{ doctorId: string }>();
  return <AdminDoctorDetail doctorId={params.doctorId} />;
}
