"use client";

import type { ReactNode } from "react";
import { PanelShell } from "@/components/shared/panel-shell";

export default function PatientLayout({ children }: { children: ReactNode }) {
  return <PanelShell role="patient">{children}</PanelShell>;
}
