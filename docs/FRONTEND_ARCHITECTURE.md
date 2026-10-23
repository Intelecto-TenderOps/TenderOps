# Arquitectura del frontend TenderOps

## Propósito

TenderOps es un cliente React que opera hoy contra un espacio de demostración persistido en `localStorage`. La forma de los servicios y contratos está preparada para sustituir ese adaptador por Azure Functions sin reescribir las pantallas.

```
React + TypeScript
        ↓
Servicios de dominio (tendersService, assessmentsService, …)
        ↓
Adaptador demo (Zustand + localStorage)   →   Futuro: API REST de Azure Functions
        ↓
Dynamics 365 · Dataverse · SharePoint · Copilot Studio · Entra ID · SECOP
```

## Organización

| Carpeta | Responsabilidad |
|---|---|
| `frontend/src/app` | Arranque, rutas y proveedores |
| `frontend/src/layouts` | `AppShell` y `RightSidebar` |
| `frontend/src/design-system` | Tokens y constantes visuales |
| `frontend/src/components` | Paneles, etiquetas, tablas, indicadores |
| `frontend/src/features` | Módulos de producto |
| `frontend/src/contracts` | Modelos TypeScript por dominio |
| `frontend/src/services` | Adaptadores de aplicación |
| `frontend/src/mocks` | Semilla coherente y MSW |
| `frontend/src/hooks` | Filtros sincronizados con la URL |
| `frontend/src/store` | UI, empresa activa y `DrawerManager` |
| `frontend/src/lib` | Formato, IDs, `cn` |
| `frontend/src/styles` | Liquid Glass y tema |
| `frontend/src/config` | Navegación y constantes |
| `frontend/src/tests` | Pruebas unitarias |

El backend .NET del repositorio no se modificó. Esta etapa no llama a Dynamics, Dataverse, SharePoint ni Copilot Studio.

## Gestión central de flujos

`useDrawerStore` es el único punto para abrir un flujo. Cualquier módulo llama `openFlow({ type, title, size, steps, payload })`. `DrawerManager` monta un único `FlowDrawer` a la izquierda del menú derecho. No se apilan paneles.

## Identificadores

Los contratos separan `tenderOpsId`, `secopId`, `dynamicsOpportunityId`, `dynamicsAccountId`, `sharePointId` y `companyId`.

## Persistencia de demostración

Clave `tenderops.demo.v1`. El botón «Restablecer demo» del menú derecho vuelve a la semilla.
