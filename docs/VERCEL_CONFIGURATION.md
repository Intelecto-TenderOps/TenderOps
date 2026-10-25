# Configuración Vercel

Vercel publica exclusivamente el frontend (`frontend/dist`).

## Estado actual

`vercel.json` no define Cron Jobs. No hay Vercel Functions de backend. El rewrite SPA envía las rutas de UI a `index.html`.

## Cliente HTTP

`frontend/src/lib/api.ts` es el cliente único.

- Vacío `VITE_API_BASE_URL` → `/api/v1` (mismo origen: Vite proxy o rewrite futuro)
- Valor real → `https://<function-app>.azurewebsites.net/api/v1`

No se dejó una URL ficticia de producción.

## Entornos

| Entorno | API |
| --- | --- |
| Local | Vite proxy `/api` → `http://127.0.0.1:7071` |
| Preview | Definir `VITE_API_BASE_URL` al Function App de test, o rewrite `/api/:path*` al mismo origen Azure |
| Producción | Igual, con el dominio definitivo de Azure |

## Rewrite opcional

Cuando exista el origen real:

```
{ "source": "/api/:path*", "destination": "https://<function-app>.azurewebsites.net/api/:path*" }
```

Verificar CORS, `Authorization` y `X-Company-Id`. Si el navegador llama Azure directo, CORS solo para orígenes autorizados (Vercel prod/preview + local).

## Autenticación

Tokens Entra. Nada de Function Keys en el frontend.

## Hobby / cron

Las tareas programadas no dependen de Vercel. Viven en Azure Functions.
