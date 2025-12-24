export type Language = "en" | "ar" | "kr";

export interface LocationType {
  title: string;
  dateAndTime: Date;
  address: string;
  id: string;
  assigned: boolean;
}

export interface StoreType {
  lang: Language;
  setLang: (lang: Language) => void;
  active: boolean;
  setActive: (active: boolean) => void;
  locations: LocationType[];
  setLocations: (locations: LocationType[]) => void;
  addLocation: (location: LocationType) => void;
  removeLocation: (id: string) => void;
  updateLocation: (id: string, location: LocationType) => void;
  getLocation: (id: string) => LocationType;
  reportOpen: boolean;
  toggleReportOpen: () => void;
  user: User | null;
  setUser: (user: User) => void;
}

export interface AuthStoreType {
  user: User | null;
  setUser: (user: User | null) => void;
  password: string | null;
  setPassword: (password: string | null) => void;
  role: { en: string; ar: string; kr: string };
  setRole: (role: { en: string; ar: string; kr: string }) => void;
}

export interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  phone: string;
  token: string;
}
// types.ts (recommended place)
export type Report = {
  id: number;
  title: string;
  sender: string;
  description: string;
  status: boolean; // true = read/open, false = unread
};
