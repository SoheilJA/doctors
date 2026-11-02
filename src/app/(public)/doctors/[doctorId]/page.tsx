import { buildSeed } from "@/mock/seed";
import { PublicDoctorProfileContent } from "./PublicDoctorProfileContent";

export async function generateStaticParams() {
  const seed = buildSeed();
  return seed.doctors
    .filter((d) => d.accountStatus === "active")
    .map((doctor) => ({
      doctorId: doctor.id,
    }));
}

export default function Page() {
  return <PublicDoctorProfileContent />;
}