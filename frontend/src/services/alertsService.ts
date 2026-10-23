import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const alertsService = {
  async list() {
    return simulateLatency(readWorkspace().alerts);
  },
  async markRead(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      alerts: workspace.alerts.map((item) => (item.id === id ? { ...item, read: true } : item)),
    }));
    return simulateLatency(true);
  },
  async toggleSilence(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      alerts: workspace.alerts.map((item) =>
        item.id === id ? { ...item, silenced: !item.silenced } : item,
      ),
    }));
    return simulateLatency(true);
  },
};
