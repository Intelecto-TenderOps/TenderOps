# Ejemplos de consulta SECOP

```
GET /api/v1/secop/processes?q=ciberseguridad&department=Bogotá&pageSize=25
GET /api/v1/secop/processes?q=CO1.REQ.2577563
GET /api/v1/secop/processes?source=SECOP_I&q=acueducto
GET /api/v1/secop/processes/{id}
GET /api/v1/secop/processes/{id}/documents
POST /api/v1/secop/sync
```

SoQL generado (nunca concatenado desde el frontend):

```
$where=upper(entidad) like '%DANE%' AND precio_base >= 100000000
$order=fecha_de_ultima_publicaci DESC,id_del_proceso ASC
$limit=25&$offset=0
```
