# Generación documental de hojas de vida

## API

- `POST /api/v1/tenders/{id}/resume-jobs`
- `GET /api/v1/resume-jobs/{id}`
- `GET /api/v1/tenders/{id}/resumes`
- `GET /api/v1/resumes/{id}` y `/preview`
- `POST /api/v1/resumes/{id}/approve`
- `POST /api/v1/resumes/{id}/regenerate`
- `GET /api/v1/resumes/{id}/versions`

## Pipeline

Permisos → profesional → proceso → consentimiento → selecciones → vigencias → plantilla → render DOCX → hash → SharePoint (si Graph está listo) → versión Dataverse → checklist.

DOCX corporativo: OOXML mínimo generado en Functions (`docx.ts`) con tablas repetibles.

Formato de entidad: variables `{{profesional.nombreCompleto}}`, `{{perfil.cargoPropuesto}}`, `{{proceso.identificador}}`, bloques de estudios/experiencias/certificaciones. Las tablas no se aplastan en un solo campo.

PDF: no se declara disponible hasta tener un convertidor verificado compatible con el plan de Functions. Mientras tanto el trabajo queda `pending_sharepoint` o documentado como conversión pendiente.

Una HV aprobada conserva snapshot. Regenerar crea una versión nueva; no reescribe la aprobada.
