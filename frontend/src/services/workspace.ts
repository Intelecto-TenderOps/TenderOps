import type { DemoWorkspace } from "@/mocks/seed";
import { useDemoStore } from "@/store/demo-store";

export function readWorkspace(): DemoWorkspace {
  return useDemoStore.getState().workspace;
}

export function writeWorkspace(mutator: (current: DemoWorkspace) => DemoWorkspace): DemoWorkspace {
  useDemoStore.getState().replace(mutator);
  return useDemoStore.getState().workspace;
}

export function simulateLatency<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}
