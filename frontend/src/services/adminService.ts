import { mapSecopSources } from "@/lib/integration";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";
import type { Membership, SourceConfig } from "@/contracts";
import { integrationsService } from "./integrationsService";

export const adminService = {
  async users() {
    return simulateLatency(readWorkspace().memberships);
  },
  async saveUser(user: Membership) {
    writeWorkspace((workspace) => ({
      ...workspace,
      memberships: workspace.memberships.some((item) => item.id === user.id)
        ? workspace.memberships.map((item) => (item.id === user.id ? user : item))
        : [user, ...workspace.memberships],
    }));
    return simulateLatency(true);
  },
  async sources(): Promise<{ items: SourceConfig[]; source: "live" | "demo"; tokenConfigured?: boolean }> {
    try {
      const [sources, status] = await Promise.all([
        integrationsService.sources(),
        integrationsService.secopStatus(),
      ]);
      return {
        items: mapSecopSources(sources.items, status),
        source: "live",
        tokenConfigured: status.tokenConfigured,
      };
    } catch {
      return simulateLatency({ items: readWorkspace().sources, source: "demo" as const });
    }
  },
  async toggleSource(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      sources: workspace.sources.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    }));
    return simulateLatency(true);
  },
  async integrations() {
    return integrationsService.list();
  },
  async audit() {
    return simulateLatency(readWorkspace().auditEvents);
  },
  async updateSource(source: SourceConfig) {
    writeWorkspace((workspace) => ({
      ...workspace,
      sources: workspace.sources.map((item) => (item.id === source.id ? source : item)),
    }));
    return simulateLatency(true);
  },
};
