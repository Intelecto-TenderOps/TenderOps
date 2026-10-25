import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";
import type { Membership, SourceConfig } from "@/contracts";

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
  async sources() {
    return simulateLatency(readWorkspace().sources);
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
    return simulateLatency(readWorkspace().integrations);
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
