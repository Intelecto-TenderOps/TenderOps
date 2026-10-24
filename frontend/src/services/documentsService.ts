import type { ProcessDocument } from "@/contracts";
import { apiGet, apiPost, isIntegrationUnconfigured, readIntegrationError } from "./http";
import { readWorkspace, writeWorkspace } from "./workspace";

type SecopDocumentRow = {
  id: string;
  name: string;
  url?: string | null;
  uploadedAt?: string | null;
};

function mapSecopDocument(row: SecopDocumentRow, tenderId: string): ProcessDocument {
  return {
    id: String(row.id),
    tenderId,
    name: String(row.name ?? "Documento"),
    category: "pliego",
    version: 1,
    status: "disponible",
    reviewed: false,
    sizeKb: 0,
    uploadedAt: String(row.uploadedAt ?? new Date().toISOString()),
    sharePointId: null,
    excerpt: row.url ? "Enlace oficial SECOP" : "Sin URL segura publicada por la fuente",
  };
}

export const documentsService = {
  async list(tenderId?: string, secopId?: string) {
    const key = secopId ?? tenderId;
    if (key) {
      try {
        const result = await apiGet<{ items: SecopDocumentRow[]; warnings?: string[] }>(
          `/api/v1/secop/processes/${encodeURIComponent(key)}/documents`,
        );
        return {
          items: result.items.map((row) => mapSecopDocument(row, tenderId ?? key)),
          warnings: result.warnings ?? [],
          source: "live" as const,
        };
      } catch {
        // El inventario SharePoint/Dataverse no se inventa; solo se cae al lote local.
      }
    }
    const items = readWorkspace().documents.filter((item) =>
      tenderId ? item.tenderId === tenderId : true,
    );
    return {
      items,
      warnings: ["Inventario local. SharePoint no está configurado."],
      source: "demo" as const,
    };
  },
  async markReviewed(id: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      documents: workspace.documents.map((item) =>
        item.id === id ? { ...item, reviewed: true, status: "disponible" } : item,
      ),
    }));
    return true;
  },
  async classify(id: string, category: string) {
    writeWorkspace((workspace) => ({
      ...workspace,
      documents: workspace.documents.map((item) =>
        item.id === id ? { ...item, category } : item,
      ),
    }));
    return true;
  },
  async add(document: ProcessDocument) {
    try {
      await apiPost("/api/v1/documents/upload-sessions", { name: document.name });
    } catch (error) {
      if (isIntegrationUnconfigured(error)) {
        writeWorkspace((workspace) => ({
          ...workspace,
          documents: [document, ...workspace.documents],
        }));
        return { item: document, sharePoint: readIntegrationError(error) };
      }
    }
    writeWorkspace((workspace) => ({
      ...workspace,
      documents: [document, ...workspace.documents],
    }));
    return { item: document };
  },
};
