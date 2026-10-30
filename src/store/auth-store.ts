"use client";

/**
 * Fake session store (persisted).
 * The demo has 4 seeded users; `loginAs` performs the "quick login" switch.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Session } from "@/types";
import type { Role } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";

interface AuthState {
  session: Session | null;
  _hasHydrated: boolean;
  loginAs: (role: Role) => Session;
  loginWithPhone: (phone: string) => Session;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      /** Instantly log in as one of the 4 seeded demo users. */
      loginAs: (role) => {
        const db = useAppStore.getState();
        let session: Session;
        if (role === "doctor") {
          const doctor = db.doctors.find((d) => d.isDemo) ?? db.doctors[0];
          session = { role, userId: doctor.id, name: doctor.name, doctorId: doctor.id, avatarHue: doctor.avatarHue };
        } else if (role === "patient") {
          const patient = db.patients.find((p) => p.isDemo) ?? db.patients[0];
          session = { role, userId: patient.id, name: patient.name, patientId: patient.id, avatarHue: patient.avatarHue };
        } else {
          const staff =
            role === "admin" ? db.staff.find((s) => s.role === "admin")! : db.staff.find((s) => s.role === "support")!;
          session = { role, userId: staff.id, name: staff.name, avatarHue: staff.avatarHue };
        }
        set({ session });
        return session;
      },

      /** OTP login: any seeded patient with a matching phone, else main demo patient. */
      loginWithPhone: (phone) => {
        const db = useAppStore.getState();
        const normalized = phone.replace(/[\s-]/g, "");
        const patient = db.patients.find((p) => p.phone.replace(/[\s-]/g, "") === normalized);
        const target = patient ?? db.patients.find((p) => p.isDemo)!;
        const session: Session = {
          role: "patient",
          userId: target.id,
          name: target.name,
          patientId: target.id,
          avatarHue: target.avatarHue,
        };
        set({ session });
        return session;
      },

      logout: () => set({ session: null }),
    }),
    {
      name: "doktorha-session-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ session: s.session }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
