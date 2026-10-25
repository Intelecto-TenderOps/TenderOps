export function openApiDocument() {
  return {
    openapi: "3.1.0",
    info: { title: "TenderOps Azure Functions API", version: "v1" },
    servers: [{ url: "/api" }],
    paths: {
      "/health/live": { get: { summary: "Liveness" } },
      "/session": { get: { summary: "Sesión y empresas autorizadas" } },
      "/v1/companies": { post: { summary: "Registrar empresa" } },
      "/v1/companies/{companyId}/{kind}": {
        get: { summary: "Listar recursos de perfil" },
        post: { summary: "Crear recurso de perfil" },
      },
      "/v1/secop/processes": { get: { summary: "Búsqueda híbrida SECOP + catálogo Dataverse" } },
      "/v1/assessments": { get: { summary: "Evaluaciones de la empresa activa" } },
      "/v1/opportunities": { get: { summary: "Oportunidades Dynamics vinculadas" }, post: { summary: "Crear oportunidad" } },
      "/v1/tasks": { get: { summary: "Tareas" }, post: { summary: "Crear o actualizar tarea" } },
      "/v1/documents": { get: { summary: "Documentos de proceso" } },
      "/v1/copilot/agents": { get: { summary: "Agentes Copilot Studio" } },
      "/v1/analytics/overview": { get: { summary: "Indicadores" } },
    },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  };
}
