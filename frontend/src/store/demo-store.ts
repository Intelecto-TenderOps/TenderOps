import { create } from "zustand";
import { DEMO_STORAGE_KEY } from "@/config/constants";
import type { DemoWorkspace } from "@/mocks/seed";
import { createSeed } from "@/mocks/seed";

function load(): DemoWorkspace {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return createSeed();
    return { ...createSeed(), ...JSON.parse(raw) } as DemoWorkspace;
  } catch {
    return createSeed();
  }
}

function persist(workspace: DemoWorkspace): void {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(workspace));
}

interface DemoState {
  workspace: DemoWorkspace;
  replace: (mutator: (current: DemoWorkspace) => DemoWorkspace) => void;
  reset: () => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  workspace: typeof localStorage === "undefined" ? createSeed() : load(),
  replace: (mutator) => {
    const workspace = mutator(get().workspace);
    persist(workspace);
    set({ workspace });
  },
  reset: () => {
    const workspace = createSeed();
    persist(workspace);
    set({ workspace });
  },
}));

export function delay(ms = 220): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
