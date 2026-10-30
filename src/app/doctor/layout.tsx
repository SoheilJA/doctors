"use client";

import type { ReactNode } from "react";
import { PanelShell } from "@/components/shared/panel-shell";

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return <PanelShell role="doctor">{children}</PanelShell>;
}
