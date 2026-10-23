import { create } from "zustand";

export type FlowSize = "compact" | "standard" | "wide";

export interface FlowSpec {
  type: string;
  title: string;
  description?: string;
  recordId?: string;
  size?: FlowSize;
  icon?: string;
  steps?: string[];
  payload?: Record<string, unknown>;
}

interface DrawerState {
  open: boolean;
  type: string | null;
  title: string;
  description: string;
  recordId?: string;
  size: FlowSize;
  step: number;
  steps: string[];
  dirty: boolean;
  payload: Record<string, unknown>;
  confirmClose: boolean;
  returnFocusId: string | null;
  hiddenDetail: boolean;
  openFlow: (spec: FlowSpec, returnFocusId?: string) => void;
  closeFlow: (force?: boolean) => boolean;
  setStep: (step: number) => void;
  setDirty: (dirty: boolean) => void;
  patchPayload: (payload: Record<string, unknown>) => void;
  setConfirmClose: (value: boolean) => void;
}

export const useDrawerStore = create<DrawerState>((set, get) => ({
  open: false,
  type: null,
  title: "",
  description: "",
  recordId: undefined,
  size: "standard",
  step: 0,
  steps: [],
  dirty: false,
  payload: {},
  confirmClose: false,
  returnFocusId: null,
  hiddenDetail: false,
  openFlow: (spec, returnFocusId) => {
    set({
      open: true,
      type: spec.type,
      title: spec.title,
      description: spec.description ?? "",
      recordId: spec.recordId,
      size: spec.size ?? "standard",
      step: 0,
      steps: spec.steps ?? [],
      dirty: false,
      payload: spec.payload ?? {},
      confirmClose: false,
      returnFocusId: returnFocusId ?? null,
      hiddenDetail: true,
    });
  },
  closeFlow: (force = false) => {
    const state = get();
    if (state.dirty && !force) {
      set({ confirmClose: true });
      return false;
    }
    const focusId = state.returnFocusId;
    set({
      open: false,
      type: null,
      dirty: false,
      confirmClose: false,
      hiddenDetail: false,
      payload: {},
      step: 0,
      steps: [],
    });
    if (focusId) {
      window.setTimeout(() => {
        document.getElementById(focusId)?.focus();
      }, 80);
    }
    return true;
  },
  setStep: (step) => set({ step }),
  setDirty: (dirty) => set({ dirty }),
  patchPayload: (payload) =>
    set({ payload: { ...get().payload, ...payload }, dirty: true }),
  setConfirmClose: (confirmClose) => set({ confirmClose }),
}));
