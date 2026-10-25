# Modelo Dataverse TenderOps

Tablas previstas (solución `TenderOps`): `vl_company`, `vl_capability`, `vl_experience`, `vl_financialsnapshot`, `vl_geocoverage`, `vl_participationrule`, `vl_assessment`, `vl_requirement`, `vl_decision`, `vl_documentlink`, `vl_audit`.

Clave de empresa: `countryCode + taxId`. Aislamiento por equipo propietario. El conector no escribe tablas no comprobadas: sin `DATAVERSE_URL` no hay upsert.
