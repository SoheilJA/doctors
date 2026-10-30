"use client";

import type { ReactNode } from "react";
import { PanelShell } from "@/components/shared/panel-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <PanelShell role="admin">{children}</PanelShell>;
}
