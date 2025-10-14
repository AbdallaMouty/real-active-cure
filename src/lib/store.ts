import { create } from "zustand";
import type { Language, LocationType, StoreType, User } from "./types";

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

export default store;
