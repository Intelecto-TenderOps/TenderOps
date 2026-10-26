# Esquema Dataverse (`tno_`)

Fuente: `powerplatform/schema-tno.json`.

## Catálogo compartido SECOP

Un proceso público existe una sola vez.

- `tno_secopprocess`
- `tno_secopsource`
- `tno_secopchange`
- `tno_secopsync`
- `tno_secopcursor`
- `tno_secopdocument`

## Por empresa

- Perfil: `tno_company`, `tno_capability`, `tno_experience`, `tno_evidence`, `tno_financial`, `tno_coverage`, `tno_rule`, `tno_membership`, `tno_team`, `tno_sourcepolicy`
- Seguimiento: `tno_tendercandidate`, `tno_savedsearch`, `tno_tenderalert`, `tno_tenderfollowup`
- Análisis: `tno_assessment`, `tno_requirement`, `tno_requirementmatch`, `tno_bidrecommendation`, `tno_biddecision`, `tno_checklistitem`, `tno_task`, `tno_integrationlink`, `tno_auditevent`
- Perfiles: `tno_professional` y colecciones (`education`, `experience`, `certification`, `license`, `skill`, `attachment`, `availability`, `consent`, `importbatch`, `importissue`), `tno_tenderstaffrole`, `tno_tenderstaffrequirement`, `tno_tenderprofessionalassignment`, `tno_resumeconfiguration`, `tno_generatedresume`, `tno_generatedresumeversion`, `tno_resumegenerationjob`

## Relaciones

Un `tno_secopprocess` puede vincularse a muchas empresas mediante `tno_tendercandidate`. Las evaluaciones, decisiones, documentos privados y tareas no se comparten entre empresas.

Las oportunidades comerciales viven en Dynamics. TenderOps guarda solo el enlace (`tno_integrationlink` / `dynamicsOpportunityId`). No se crea una oportunidad por cada proceso encontrado.

## Tablas elásticas

No se usan. El volumen previsto del catálogo reciente (90 días, con tope por ejecución) no justifica el cambio.

## Prefijo anterior

`powerplatform/schema.json` usaba `tpo_`. No se aplica automáticamente. Si el sandbox tiene filas `tpo_`, mapearlas antes de retirarlas.
