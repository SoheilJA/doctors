"use client";

import type { ReactNode } from "react";
import { PanelShell } from "@/components/shared/panel-shell";

export default function SupportLayout({ children }: { children: ReactNode }) {
  return <PanelShell role="support">{children}</PanelShell>;
}
