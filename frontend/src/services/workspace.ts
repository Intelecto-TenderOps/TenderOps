import { apiFetch, usesRemoteApi } from "@/lib/api";
import type { DemoWorkspace } from "@/mocks/seed";
import { createSeed } from "@/mocks/seed";
import { useDemoStore } from "@/store/demo-store";
import { useUiStore } from "@/store/ui-store";

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

export async function hydrateWorkspace(): Promise<DemoWorkspace | null> {
  if (!usesRemoteApi()) return null;
  const companyId = useUiStore.getState().companyId;
  const remote = await apiFetch<Partial<DemoWorkspace>>(`/companies/${companyId}/workspace`);
  const next = { ...createSeed(), ...remote } as DemoWorkspace;
  useDemoStore.setState({ workspace: next });
  return next;
}
