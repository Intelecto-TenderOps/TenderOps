# Despliegue Vercel

- Build: instala frontend y `packages/backend`, empaqueta `frontend/dist`.
- Rewrites: `/api/*` llega a Functions; el resto es SPA (`/procesos/:id/matriz` incluido).
- Variables: las de `.env.example`. Configurar `SOCRATA_APP_TOKEN` y `CRON_SECRET` en el dashboard, nunca en git. Nada con prefijo `VITE_` debe contener secretos de Microsoft o Supabase service role.
- Cron: `GET /api/v1/secop/sync` cada minuto. En Hobby Vercel puede limitar a una vez al día; Explorar refetch y el modo hybrid cubren la consulta recurrente.
- Preview no debe apuntar a Dynamics/Dataverse de producción.

Comando local:

```bash
npm --prefix packages/backend ci
npm --prefix packages/backend run dev
cd frontend && npm run dev
```

API: `http://127.0.0.1:8787/api/v1/secop/processes?q=software&pageSize=5`
