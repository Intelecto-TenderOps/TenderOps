import type { ProcessDocument } from "@/contracts";
import { readWorkspace, simulateLatency, writeWorkspace } from "./workspace";

export const documentsService = {
  async list(tenderId?: string) {
    const items = readWorkspace().documents.filter((item) =>
      tenderId ? item.tenderId === tenderId : true,
    );
    return simulateLatency(items);
  },
  async markReviewed(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      documents: workspace.documents.map((item) =>
        item.id === id ? { ...item, reviewed: true, status: "disponible" } : item,
      ),
    }));
    return simulateLatency(true);
  },
  async classify(id: string, category: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      documents: workspace.documents.map((item) =>
        item.id === id ? { ...item, category } : item,
      ),
    }));
    return simulateLatency(true);
  },
  async add(document: ProcessDocument) {
    writeWorkspace((workspace) => ({
      ...workspace,
      documents: [document, ...workspace.documents],
    }));
    return simulateLatency(document);
  },
};
