import { create } from "zustand";
import { User } from "firebase/auth";
import { TmsUser } from "@/types";

interface AuthState {
  firebaseUser: User | null;
  tmsUser: TmsUser | null;
  loading: boolean;
  setFirebaseUser: (user: User | null) => void;
  setTmsUser: (user: TmsUser | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  tmsUser: null,
  loading: true,
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setTmsUser: (user) => set({ tmsUser: user }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ firebaseUser: null, tmsUser: null, loading: false }),
}));
