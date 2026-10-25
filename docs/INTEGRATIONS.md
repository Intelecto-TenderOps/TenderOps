# Integraciones

Ninguna integración privada se declara operativa hasta comprobarse con credenciales reales. SECOP público sí se consultó en las pruebas.

## Microsoft Entra ID

- SPA: Authorization Code + PKCE (`@azure/msal-browser`)
- API: validación JWT (`tid` + `oid`, audiencia `ENTRA_API_AUDIENCE`)
- Identidad de integración: managed identity / `ENTRA_SERVICE_CLIENT_ID`
- No se usan Function Keys como único control de datos empresariales

## Dataverse

Cliente Web API v9.2. Deshabilitado si falta `DATAVERSE_URL` o `DATAVERSE_METADATA_VERIFIED=true`. En local se usa Memory.

## Dynamics 365 Sales

Búsqueda de cuentas/contactos, creación/actualización de oportunidades, tareas y reconciliación. OAuth desde Functions. Dynamics es dueño de la información comercial. Sin configuración → `503 dynamics_not_configured`.

## SharePoint / Graph

Sitio: `https://intelecto1.sharepoint.com/sites/intelectocrm`  
Biblioteca: `Cuenta`  
Ruta: `account/{cuenta}/opportunity/{oportunidad}/Pliegos`

Dataverse guarda metadatos y enlaces. Los archivos permanecen en SharePoint.

## Copilot Studio

Gateway `/api/v1/copilot/*`. Agentes: orquestador, viabilidad, estrategia, observaciones, documentos, candidatos. No se introduce otro motor de IA ni Power Automate. Sin licenciamiento/configuración → `503 copilot_not_configured` (sin respuesta ficticia en ese modo).

## SECOP

API pública de datos.gov.co. `SOCRATA_APP_TOKEN` es opcional. Funciona sin secretos privados.
