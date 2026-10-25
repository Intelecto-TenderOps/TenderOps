# Resultados SECOP (consulta pública real)

Fecha: 24 de octubre de 2026, 14:27 America/Bogota.

Comando: `npm --prefix packages/backend run secop:sample`

| Comprobación | Resultado |
|---|---|
| HTTP Socrata `p6dx-8zbt` | OK, 5 registros |
| Identificadores | `CO1.REQ.10000080` … `CO1.REQ.10000585` |
| Búsqueda exacta | Coincidencia `CO1.REQ.10000080` |
| Paginación `$offset` | Distinta de la primera página |
| Last-Modified del origen | Fri, 23 Oct 2026 15:02:34 GMT |
| RequestId Socrata | `6d31d8367f08183121182b4be5628a8e` |
| Token Socrata | Configurado (`tokenConfigured: true`; el valor no se registra) |
| Estado calculado | `por_verificar` cuando apertura=Abierto sin fecha de cierre |

Las URL oficiales de esa muestra apuntan a `community.secop.gov.co/STS/Users/Login/Index` (valor del dataset, no inventado).

Detalle JSON: `docs/SECOP_TEST_RESULTS.json`.
