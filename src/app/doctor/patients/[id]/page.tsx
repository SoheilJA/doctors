import { buildSeed } from "@/mock/seed";
import { DoctorPatientDetailContent } from "./DoctorPatientDetailContent";

export async function generateStaticParams() {
  const seed = buildSeed();
  return seed.patients.map((patient) => ({
    id: patient.id,
  }));
}

export default function Page() {
  return <DoctorPatientDetailContent />;
}