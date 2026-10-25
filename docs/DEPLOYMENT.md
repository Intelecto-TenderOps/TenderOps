# Despliegue

No desplegar recursos Azure sin autorización.

## Local

```bash
cd apps/api-azure
cp .env.example .env   # opcional; local.settings.json ya habilita demo
npm ci
npm test
npm run build
# func start   # requiere Azure Functions Core Tools y Azurite para colas
```

```bash
cd frontend
cp .env.example .env
npm ci
npm test
npm run dev
```

El frontend de demostración funciona sin Functions. Para API real local: `VITE_USE_AZURE_API=true` y Functions en el puerto 7071.

## Azure Functions

1. Revisar `infra/functions.bicep` (no aplicar aún).
2. Crear resource group Dev/Test/Prod separados.
3. `az deployment group create` solo con aprobación.
4. Asignar RBAC de la identidad a Dataverse/Graph/Key Vault.
5. Cargar secretos en Key Vault, no en Bicep.
6. Publicar `apps/api-azure` al Function App Flex Consumption.

## Vercel

Build: `npm --prefix frontend ci && npm --prefix frontend run build`  
Output: `frontend/dist`  
Configurar `VITE_API_BASE_URL` únicamente cuando el Function App exista.

## Dataverse

`powerplatform/schema-tno.json` es el modelo. Provisionar en sandbox con los scripts existentes adaptados al prefijo `tno_`. Marcar `DATAVERSE_METADATA_VERIFIED=true` solo después del informe real.
