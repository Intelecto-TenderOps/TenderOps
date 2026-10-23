# Operación del primer incremento

## Desarrollo local

Requisitos: SDK fijado en global.json, Node 24 o superior compatible con Vite, npm, certificado HTTPS de desarrollo. Desde la raíz:

```
dotnet restore TenderOps.slnx --locked-mode
dotnet test TenderOps.slnx
cd frontend
npm ci
npm run build
```

Copiar `frontend/dist/` a `src/TenderOps.Api/wwwroot/` y ejecutar `dotnet run --project src/TenderOps.Api`. Abrir `https://localhost:7043`. El perfil Development activa exclusivamente el doble efímero y cinco usuarios sintéticos; no iniciar el worker con este almacén. La misma API sirve frontend y BFF. Para hot reload se puede usar `npm run dev`; la verificación de sesión Secure se hace con el sitio HTTPS, no con un proxy HTTP.

`npm test`, `npm run lint` y `npm run test:e2e` (API HTTPS encendida y Chromium instalado) comprueban el frontend. `dotnet test` usa dos empresas y cookies reales del servidor de pruebas; no llama Entra/Dataverse/Azure. `TENDEROPS_CONTRACT_OUTPUT` permite exportar OpenAPI desde la prueba de contrato.

## Conexión real

No introducir IDs propios, certificados, secretos ni tokens en archivos versionados. El enlace de una solución Power Apps no es la URL del servicio de organización. Configurar:

| Variable de entorno | Valor esperado |
| --- | --- |
| Storage__Mode | Dataverse |
| Demo__Enabled | false |
| Entra__TenantId / ClientId | Directorio y aplicación web BFF |
| Entra__ClientSecret | Referencia segura de Key Vault / secreto de entorno |
| Dataverse__Url | Origen HTTPS de organización |
| Dataverse__Prefix | Publisher real aprobado |
| Dataverse__TenantId / ClientId | Identidad de aplicación Dataverse |
| Dataverse__KeyVaultUri / CertificateName | Certificado con clave privada, acceso Download mediante identidad administrada |
| Dataverse__BusinessUnitId / CompanyRoleId | Unidad y rol mínimo para equipos propietarios |
| Dataverse__MetadataVerified | true solo después del informe real de metadatos/seguridad |
| DataProtection__BlobUri | Blob para llaves compartidas entre réplicas |
| DataProtection__KeyUri | Clave Key Vault sin versión para rotación |
| ServiceBus__Namespace / Queue | FQDN del namespace y cola v1 |
| AllowedHosts | Host BFF autorizado |
| ReverseProxy__KnownNetworks__0 | CIDR de ingreso real autorizado; se rechaza arrancar sin red confiable fuera de local |
| OTEL_EXPORTER_OTLP_ENDPOINT | Colector OTLP autorizado, sin capturar cuerpos ni headers de autenticación |

Entra: plataforma Web, redirect URI `https://HOST/signin-oidc`, logout callback `/signout-callback-oidc`, directorio único, code+PKCE, permisos OIDC mínimos. El certificado de Dataverse corresponde a un application user con rol mínimo, nunca System Administrator. La identidad administrada del contenedor necesita acceso al certificado; su uso no implica acceso Dataverse.

Esquema: revisar `powerplatform/schema.json`, publisher y solución existente. Ejecutar `Provision-Schema.ps1` primero sin `-Apply`; pasar token por variable temporal segura. El script no crea roles/perfiles de campo automáticamente: aprobar y configurar los de `security` antes de habilitar runtime. Tras aplicar y verificar en sandbox, `Package-Solution.ps1` exporta solución administrada y fuente desempaquetada. En ausencia de esa ejecución el repositorio contiene esquema/procedimiento reproducible, **no una solución ya importada o aceptada**. Los IDs deterministas sirven de clave primaria natural; pruebas de carreras reales siguen siendo obligatorias. No se crean tablas de oportunidades ni de IA.

Bicep entrega recursos base Dev/Test/Prod. Antes de un despliegue real faltan asignaciones RBAC de identidades, referencias de secretos de Container Apps, clave de cifrado y blob inicial de Data Protection, colector OTLP/Application Insights, hosts, callbacks y registro de contenedores. Estos son bloqueos explícitos de despliegue; no usar las imágenes de ejemplo como reales. Probar cookies y claves compartidas con dos réplicas. No se despliega producción desde CI.

## Recuperación y soporte

Outbox confirma cambios antes de enviar. Un fallo posterior al commit conserva el evento; un fallo posterior a publicar puede duplicarlo después del lease de 2 minutos. Dos publicadores compiten mediante ETag. Inbox deduplica consumidor/empresa/eventId y cambios juntos. Las bibliotecas exponen este mecanismo; no hay consumidor comercial activado en este incremento.

Errores de validación, permisos y autenticación no se reintentan automáticamente. Para 408/429/5xx usar backoff con jitter y Retry-After cuando lo entregue el adaptador; los errores públicos llevan código seguro y correlación. El cliente actual no oculta un retry dentro de un changeset: el comando conserva su clave al ser reintentado. El worker se detiene ante rechazo permanente y requiere intervención; falta un registro persistente de intentos/replay operativo completo. La cola Service Bus define maxDeliveryCount=5; un consumidor futuro debe exponer DLQ/replay con autorización.

Auditoría funcional append-only; no conceder Delete/Write de registros históricos a usuarios humanos. Administradores sin financial.read reciben payload financiero redactado al consultar auditoría. Activar auditoría nativa Dataverse y aprobar retención según la política corporativa. No se ejecutan purgas.

Rotación: crear nueva versión de certificado/clave en Key Vault, publicar certificado público en Entra y reiniciar nuevas revisiones gradualmente; validar Dataverse antes de retirar el anterior. BFF ClientSecret también rota mediante referencia segura. Copia/restauración Dataverse y recuperación Blob se validan en Test antes de promover. Rollback: volver a imagen previa y conservar columnas aditivas; no eliminar tablas ni revertir datos automáticamente. Restauración, alertas y rollback **no ejecutados** todavía.
