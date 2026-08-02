import { create } from 'zustand';

import type { AuthSession } from '../domain/auth';

type AuthStoreState = {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  setActiveCompany: (activeCompany: AuthSession['activeCompany']) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  setActiveCompany: (activeCompany) =>
    set((state) =>
      state.session
        ? {
            session: {
              ...state.session,
              activeCompany,
            },
          }
        : state,
    ),
  clearSession: () => set({ session: null }),
}));
