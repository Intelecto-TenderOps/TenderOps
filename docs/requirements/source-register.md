# Fuentes y alcance

- Arquitectura_y_5_prompts_Licitaciones.txt, referencia del 22 de octubre de 2026: define la división de incrementos; este PR se limita al prompt 1. Los prompts posteriores se conservan como planificación, sin ejecutarlos como instrucciones adicionales.
- Backlog_Vitomato_Dynamics365_Dataverse.docx v1.0: 92 historias. SHA-256 del documento consultado: `7EB0E8E737D605253817096DD481959339EE5734F9ACE83D9E46747998B4ADC5`. Los 92 títulos del registro coinciden con el DOCX; prioridades, etiquetas de evidencia y criterios proceden de su fuente de autoría. La matriz no convierte propuestas en capacidades confirmadas.
- Ocho estándares frontend de Skills-IA/agent-skills: arquitectura/librerías, formularios/Zod, referencia ITC, React, rutas/autorización, estado/datos, pruebas y accesibilidad. Se consideran referencias técnicas aportadas, sujetas a la arquitectura y alcance solicitados.

Excepciones explícitas: ITC no está disponible, por lo que no se inventan imports; sesión BFF sustituye los ejemplos con tokens en Zustand/localStorage. Se conserva el README inicial y no se crean otros README. Las referencias originales del proyecto no se modifican.

`stories.json` y `traceability.csv` son la matriz completa. `docs/verification.md` detalla el estado verificable de las 18 historias de esta etapa. Para regenerar los datos base, ejecutar `node scripts/build-traceability.mjs RUTA_A_LA_FUENTE_DE_AUTORIA`; no ejecutar el archivo Python ni sobrescribir referencias sincronizadas.
