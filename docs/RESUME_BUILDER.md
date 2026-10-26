# Constructor de hojas de vida

Flujo `resume-builder` en panel extraancho (dos columnas: selección y vista previa).

Pasos: identificación, datos personales, estudios, experiencias, certificaciones, acreditaciones, vista previa, generación.

El usuario elige exactamente qué IDs incluir. El servidor verifica que todos pertenecen al profesional y a la empresa autorizada. No se confía en textos libres del frontend como fuente de verdad.

Datos personales: nombre, identificación, contacto y ciudad se incluyen solo si el usuario los autoriza o el proceso los exige.

Una certificación vencida genera advertencia y no se presenta como vigente.

Quitar de la HV una experiencia necesaria para un requisito muestra advertencia en el motor de matching sobre la selección, no sobre el banco completo.
