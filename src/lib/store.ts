import { create } from "zustand";
import type {
  AuthStoreType,
  Language,
  LocationType,
  StoreType,
  User,
} from "./types";
import { persist, createJSONStorage } from "zustand/middleware";

const store = create<StoreType>((set) => ({
  lang: "en",
  setLang: (lang: Language) => set({ lang }),
  active: false,
  setActive: (active: boolean) => set({ active }),
  locations: [],
  setLocations: (locations: LocationType[]) => set({ locations }),
  addLocation: (location: LocationType) =>
    set((state) => ({ locations: [...state.locations, location] })),
  removeLocation: (id: string) =>
    set((state) => ({
      locations: state.locations.filter((location) => location.id !== id),
    })),
  updateLocation: (id: string) =>
    set((state) => ({
      locations: state.locations.map((location) =>
        location.id === id ? location : location
      ),
    })),
  getLocation: (id: string) =>
    //@ts-expect-error any
    set((state) => ({
      locations: state.locations.filter((location) => location.id === id),
    }))[0],
  reportOpen: false,
  toggleReportOpen: () => set((state) => ({ reportOpen: !state.reportOpen })),
  user: null,
  setUser: (user: User) => set(() => ({ user })),
}));

export const authStore = create(
  persist<AuthStoreType>(
    (set) => ({
      user: null,
      setUser: (user: User | null) => set(() => ({ user })),
      password: null,
      setPassword: (password: string | null) => set(() => ({ password })),
      role: {
        en: "Sales Representative",
        ar: "مندوب مبيعات",
        kr: "نوێنەری فرۆشتن",
      },
      setRole: (role: { en: string; ar: string; kr: string }) =>
        set(() => ({ role })),
    }),
    { name: "authStore", storage: createJSONStorage(() => localStorage) }
  )
);

export default store;
