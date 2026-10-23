import { create } from "zustand";
interface UiState {
  companyId: string;
  selectCompany: (id: string) => void;
  comparisons: Record<string, string[]>;
  compare: (companyId: string, id: string) => void;
  clearComparison: (companyId: string) => void;
}
// No persistence middleware, credentials, session or server-owned profile data.
export const useUi = create<UiState>((set) => ({
  companyId: "",
  selectCompany: (companyId: string) => set({ companyId }),
  comparisons: {},
  compare: (companyId, id) =>
    set((state) => {
      const current = state.comparisons[companyId] ?? [];
      return {
        comparisons: {
          ...state.comparisons,
          [companyId]: current.includes(id)
            ? current.filter((value) => value !== id)
            : current.length < 10
              ? [...current, id]
              : current,
        },
      };
    }),
  clearComparison: (companyId) =>
    set((state) => ({
      comparisons: { ...state.comparisons, [companyId]: [] },
    })),
}));
