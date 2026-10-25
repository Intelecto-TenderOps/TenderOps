import { loadEnv } from "../config/env.js";
import { SocrataClient } from "./socrata.js";

const ALLOWED_HOSTS = new Set(["community.secop.gov.co", "www.colombiacompra.gov.co", "www.datos.gov.co", "secop.gov.co"]);

export class SecopDocumentDiscoveryService {
  constructor(
    private readonly client = new SocrataClient(),
    private readonly env = loadEnv(),
  ) {}

  async list(processId: string, portfolioId?: string) {
    const warnings = [
      "El conjunto dmgg-8hin cubre archivos desde 2025 y no es un histórico completo.",
      "id_del_proceso e id_del_portafolio no son intercambiables.",
    ];
    const items: Array<Record<string, unknown>> = [];
    const params = new URLSearchParams({ $limit: "20", $q: processId });
    try {
      const result = await this.client.getJson(this.env.SECOP_II_DOCUMENTS_DATASET_ID, params);
      if (Array.isArray(result.body)) items.push(...(result.body as Record<string, unknown>[]));
    } catch {
      warnings.push("No se pudo consultar dmgg-8hin. Se conserva el enlace oficial del proceso.");
    }
    if (portfolioId) {
      warnings.push(`Portafolio ${portfolioId} no se usa como sustituto del id de proceso.`);
    }
    return {
      items: items.map((row) => ({
        id: String(row.id ?? row.nombre_archivo ?? crypto.randomUUID()),
        name: row.nombre_archivo ?? row.nombre ?? "Documento",
        url: safeUrl(row.url ?? row.ruta),
        processId,
        officialId: row.id,
        uploadedAt: row.fecha_de_publicacion ?? row.fecha,
        raw: row,
      })),
      warnings,
      officialProcessUrlHint: "Si no hay archivos por API, use la URL oficial del proceso; no se inventan documentos.",
    };
  }
}

export function safeUrl(value: unknown) {
  const raw = typeof value === "string" ? value : value && typeof value === "object" && "url" in value ? String((value as { url: string }).url) : "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (![...ALLOWED_HOSTS].some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    return url.toString();
  } catch {
    return null;
  }
}
