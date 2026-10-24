# Despliegue Vercel

- Build: instala frontend y `packages/backend`, empaqueta `frontend/dist`.
- Rewrites: `/api/*` llega a Functions; el resto es SPA (`/procesos/:id/matriz` incluido).
- Variables: las de `.env.example`. Nada con prefijo `VITE_` debe contener secretos de Microsoft o Supabase service role.
- Preview no debe apuntar a Dynamics/Dataverse de producción.

Comando local:

```bash
npm --prefix packages/backend ci
npm --prefix packages/backend run dev
cd frontend && npm run dev
```

API: `http://127.0.0.1:8787/api/v1/secop/processes?q=software&pageSize=5`
