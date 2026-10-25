# Seguridad

- Secretos solo en env / Key Vault. Nada en `VITE_`.
- JWT Entra cuando `ENTRA_API_AUDIENCE` existe. SECOP de lectura puede ser anónimo.
- `X-Company-Id` no se confía para autorizar recursos ajenos.
- SoQL con allowlist; URLs de documentos con allowlist de hosts (anti-SSRF).
- Idempotencia en escrituras comerciales (`Idempotency-Key`).
- CORS configurable.
