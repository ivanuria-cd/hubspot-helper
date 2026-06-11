# Exportar JSON por origen

**Prerrequisitos:** tener al menos un origen con propiedades mapeadas.
**Tiempo estimado:** 2 minutos

La exportación genera un fichero JSON con las propiedades asociadas a un origen, incluyendo el campo origen y las reglas de transformación. Es un contrato de integración pensado para que el equipo de desarrollo sepa exactamente qué enviar a HubSpot y cómo transformar cada valor.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Pulsa **Exportar JSON**. Se despliega un menú con un elemento por cada origen del proyecto.
3. Selecciona el origen que quieras exportar.
4. El navegador descarga un fichero con el nombre `{nombre-origen}_{fecha}.json`.

## Qué contiene el fichero

- `schema_version`: versión del contrato (actualmente 1).
- `origin`: identificador, nombre y tipo del origen.
- `exported_at`: fecha y hora de la exportación.
- `properties`: para cada propiedad mapeada a ese origen, su nombre técnico, etiqueta, objeto, tipo, campo origen y las transformaciones (valor origen → valor HubSpot).

## Resultado esperado

Un fichero JSON descargado, listo para compartir con el equipo de desarrollo o adjuntar a la documentación de la integración.

## Preguntas frecuentes

**¿Se guarda el JSON en Google Drive?** No. La exportación se genera bajo demanda y se descarga localmente; no se almacena automáticamente en Drive.

**¿Por qué exportar por origen y no todo junto?** Cada origen suele corresponder a una integración distinta; el contrato por origen es justo lo que necesita quien desarrolla esa integración.
