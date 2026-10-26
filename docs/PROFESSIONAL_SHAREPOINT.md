# SharePoint del banco de perfiles

Los binarios no se duplican en Dataverse.

## Banco

`BancoPerfiles/{profesionalId}/` con subcarpetas Documentos, Estudios, Experiencias, Certificaciones, Matrículas, Consentimientos, HojasDeVidaOriginales.

## Expediente

`Expedientes/{procesoId}/Personal/{profesionalId}/` con DocumentosGenerados, SoportesSeleccionados, Versiones, Paquetes.

El paquete referencia los certificados del banco; no copia el mismo PDF si ya existe.

Sin Graph configurado, Functions registra la ruta lógica y el estado `pending`. No se finge una carga exitosa.
