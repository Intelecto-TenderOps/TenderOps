import { loadEnv } from "../config/env.js";
import { SocrataClient } from "./socrata.js";

export interface ProcessChange {
  processId: string;
  field: string;
  previousValue: string | null;
  currentValue: string | null;
  changeType: "status" | "date" | "value" | "modality" | "object" | "document" | "other";
  sourceDate: string | null;
  detectedAt: string;
  origin: "modifications-dataset" | "version-diff";
  isAddendum: boolean;
}

export class SecopChangeDetectionService {
  constructor(
    private readonly client = new SocrataClient(),
    private readonly env = loadEnv(),
  ) {}

  async list(processId: string): Promise<{ items: ProcessChange[]; warnings: string[] }> {
    const warnings = [
      "Los conjuntos oficiales de modificaciones cubren ventanas limitadas y no son un historial completo.",
      "Un cambio de metadatos no implica automáticamente una adenda documental.",
    ];
    const items: ProcessChange[] = [];
    try {
      const params = new URLSearchParams({ $limit: "20", $q: processId });
      const ii = await this.client.getJson(this.env.SECOP_II_MODIFICATIONS_DATASET_ID, params);
      const rows = Array.isArray(ii.body) ? (ii.body as Record<string, unknown>[]) : [];
      for (const row of rows) {
        items.push({
          processId,
          field: String(row.campo ?? row.tipo_de_modificacion ?? "modificacion"),
          previousValue: row.valor_anterior ? String(row.valor_anterior) : null,
          currentValue: row.valor_nuevo ? String(row.valor_nuevo) : null,
          changeType: "other",
          sourceDate: row.fecha ? String(row.fecha) : null,
          detectedAt: new Date().toISOString(),
          origin: "modifications-dataset",
          isAddendum: false,
        });
      }
    } catch {
      warnings.push("No fue posible consultar e2u2-swiw con el identificador indicado; el esquema de modificaciones se validará al activar la sync.");
    }
    return { items, warnings };
  }

  diff(previous: Record<string, unknown>, current: Record<string, unknown>, processId: string): ProcessChange[] {
    const fields: Array<[string, ProcessChange["changeType"]]> = [
      ["sourceStatus", "status"],
      ["closingDate", "date"],
      ["estimatedValue", "value"],
      ["modality", "modality"],
      ["title", "object"],
    ];
    return fields
      .filter(([field]) => String(previous[field] ?? "") !== String(current[field] ?? ""))
      .map(([field, changeType]) => ({
        processId,
        field,
        previousValue: previous[field] == null ? null : String(previous[field]),
        currentValue: current[field] == null ? null : String(current[field]),
        changeType,
        sourceDate: current.lastSourcePublicationDate ? String(current.lastSourcePublicationDate) : null,
        detectedAt: new Date().toISOString(),
        origin: "version-diff" as const,
        isAddendum: false,
      }));
  }
}
