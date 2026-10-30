"use client";

/**
 * Hydration gate: ensures the persisted Zustand stores rehydrate before
 * panel data is rendered (avoids SSR/CSR mismatches), and `useDemoLoading`
 * simulates the 300–600ms loading skeletons required by the spec.
 */

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

export function StoreHydration() {
  useEffect(() => {
    useAppStore.getState().setHasHydrated(true);
    useAuthStore.getState().setHasHydrated(true);
  }, []);
  return null;
}

/** True until stores hydrated AND the simulated network delay elapsed. */
export function useDemoLoading(delayMs?: number): boolean {
  const hydrated = useAppStore((s) => s._hasHydrated);
  const [simulated, setSimulated] = useState(true);

  useEffect(() => {
    const ms = delayMs ?? 350 + Math.random() * 250;
    const timer = setTimeout(() => setSimulated(false), ms);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return !hydrated || simulated;
}

/** True once the app store has rehydrated from localStorage. */
export function useStoreHydrated(): boolean {
  return useAppStore((s) => s._hasHydrated);
}
