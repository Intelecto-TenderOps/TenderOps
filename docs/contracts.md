# API y eventos v1

OpenAPI se obtiene con sesión autorizada en `/openapi/v1.json`. El artefacto `contracts/openapi-v1.json` se exporta mediante la prueba de contrato. El modelo Resource envuelve `id`, `companyId`, `kind`, `version`, `data`; el cuerpo de cada tipo se define en los DTO de Core y las validaciones equivalentes de frontend. El navegador nunca envía OData ni tokens OAuth.

| Método/ruta | Uso |
| --- | --- |
| GET /api/csrf | Token antiforgery, incluso antes del login |
| GET /auth/login | Challenge Entra; callback OIDC gestionado por middleware |
| POST /api/logout | Cierra cookie y sesión Entra; requiere CSRF |
| GET /api/session | Identidad, empresas autorizadas, permisos, token CSRF |
| POST /api/v1/companies | Registra empresa y membresía inicial atómicamente |
| POST /api/v1/companies/{companyId}/select | Verifica empresa seleccionada |
| GET /api/v1/companies/{companyId}/{kind} | Página: offset 0–10000, limit 1–100 |
| GET /api/v1/companies/{companyId}/{kind}/{id} | Recurso y ETag |
| POST /api/v1/companies/{companyId}/{kind} | Crea recurso tipado; Idempotency-Key UUID |
| PUT /api/v1/companies/{companyId}/{kind}/{id} | Actualiza; If-Match e Idempotency-Key obligatorios |
| POST /api/v1/companies/{companyId}/{kind}/{id}/approve | Aprueba corte o publica regla; If-Match obligatorio |
| GET /api/v1/companies/{companyId}/financial/eligible | Solo cortes aprobados vigentes |
| GET /api/v1/companies/{companyId}/audit | Bitácora paginada, con permiso específico |
| GET /api/v1/companies/{companyId}/evidence/{id}/download | Comprueba acceso; cerrado con 503 hasta pipeline seguro |

Tipos: `company`, `capability`, `experience`, `evidence`, `financial`, `coverage`, `rule`, `membership`, `team`, `sourcepolicy`, `job`. `job` solo consulta; comandos de trabajo se habilitan con un procesador real. POST company genérico no está permitido; usar /companies. Finanzas y membresías exigen permisos de lectura propios.

Todas las mutaciones `/api` requieren `X-CSRF-TOKEN` asociado a la cookie de la sesión actual. Para un reintento deliberado usar el mismo Idempotency-Key y exactamente la misma operación/cuerpo/If-Match. Clave reutilizada con otro contenido: 409. Sin If-Match: 428; versión obsoleta: 412. Recursos aprobados/publicados no permiten editar. Propiedades desconocidas se rechazan. El resultado de replay resuelve el mismo recurso (puede mostrar su versión vigente); no reejecuta el cambio.

Problem Details: `type=urn:tenderops:problem:<code>`, `status`, `title`, `code`, `correlationId`. No se devuelve texto de errores Dataverse. Dinero: cadena decimal sin separadores de miles, 1–24 dígitos enteros y hasta 4 decimales; moneda de 3 letras. Fechas de negocio `yyyy-MM-dd`. Eventos UTC y esquema `contracts/event-v1.schema.json`.

Outbox/inbox: evento sin datos financieros/documentales; la empresa acompaña todos los mensajes. Lease 2 minutos con control ETag. Entrega al menos una vez; consumidor deduplica por empresa/consumer/eventId y confirma inbox con cambios. Un consumidor no debe sobrescribir una entityVersion más reciente; saltos requieren consulta de estado. En esta etapa no hay consumidores de IA ni Dynamics. Las librerías contienen los mecanismos, no acreditan que el flujo Azure haya sido ejecutado.
