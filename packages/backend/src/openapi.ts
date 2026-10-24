export function openApiDocument() {
  return {
    openapi: "3.1.0",
    info: { title: "TenderOps API", version: "1.0.0" },
    servers: [{ url: "/api/v1" }],
    paths: {
      "/health": { get: { summary: "Salud" } },
      "/secop/processes": { get: { summary: "Buscar procesos SECOP" } },
      "/secop/processes/{id}": { get: { summary: "Obtener proceso" } },
      "/secop/search": { get: { summary: "Búsqueda SECOP" } },
      "/secop/sync": { post: { summary: "Encolar o ejecutar sync limitada" } },
      "/assessments": { post: { summary: "Calcular evaluación determinista" } },
      "/opportunities/from-tender": { post: { summary: "Crear oportunidad Dynamics" } },
      "/admin/integrations": { get: { summary: "Estado de integraciones" } },
    },
  };
}
