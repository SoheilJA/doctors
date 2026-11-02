import { buildSeed } from "@/mock/seed";
import { AdminDoctorDetailContent } from "./AdminDoctorDetailContent";

export async function generateStaticParams() {
  const seed = buildSeed();
  return seed.doctors.map((doctor) => ({
    doctorId: doctor.id,
  }));
}

export default function Page() {
  return <AdminDoctorDetailContent />;
}