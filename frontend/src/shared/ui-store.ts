import { create } from 'zustand';
interface UiState { companyId: string; selectCompany: (id: string) => void }
// No persistence middleware, credentials, session or server-owned profile data.
export const useUi = create<UiState>((set) => ({ companyId: '', selectCompany: (companyId: string) => set({ companyId }) }));
