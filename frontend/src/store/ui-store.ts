import { create } from "zustand";

interface UiState {
  companyId: string;
  navExpanded: boolean;
  navPinned: boolean;
  mobileNavOpen: boolean;
  theme: "light" | "dark";
  density: "comfortable" | "compact";
  setCompany: (id: string) => void;
  setNavExpanded: (value: boolean) => void;
  toggleNavPinned: () => void;
  setMobileNavOpen: (value: boolean) => void;
  toggleTheme: () => void;
  setDensity: (value: "comfortable" | "compact") => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  companyId: "co-andina",
  navExpanded: false,
  navPinned: false,
  mobileNavOpen: false,
  theme: "light",
  density: "comfortable",
  setCompany: (companyId) => set({ companyId }),
  setNavExpanded: (navExpanded) => set({ navExpanded }),
  toggleNavPinned: () =>
    set({ navPinned: !get().navPinned, navExpanded: !get().navPinned }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  toggleTheme: () => {
    const theme = get().theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
  setDensity: (density) => set({ density }),
}));
