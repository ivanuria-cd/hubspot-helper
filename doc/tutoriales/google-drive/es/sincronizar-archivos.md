# Sincronizar archivos

**Prerrequisitos:** cuenta de Google conectada y carpeta de trabajo seleccionada.
**Tiempo estimado:** 1 minuto.

## Pasos

1. Abre **Configuración > Conectores > Google Drive**.
2. En la sección **Sincronización** verás la fecha de la última sincronización.
3. Pulsa **Sincronizar** para traer el estado actual de los archivos desde Google Drive.
4. Revisa la lista de **Archivos gestionados**: cada archivo muestra su estado (Sincronizado, En conflicto o Pendiente).
5. Si aparece un aviso de conflicto, decide qué versión conservar antes de seguir trabajando.

## Resultado esperado

La fecha de última sincronización se actualiza y cada archivo gestionado muestra su estado. Si no hay conflictos, todos aparecen como **Sincronizado**.

## Preguntas frecuentes

**¿Cuándo se sincroniza la app?**
Al abrir el proyecto la app contrasta su estado con Google Drive, y puedes forzar una sincronización manual en cualquier momento con el botón **Sincronizar**, sin reiniciar la app.

**¿Qué versión manda si hay diferencias?**
Google Drive es la fuente de verdad: si solo cambió la versión de Drive, se adopta esa. Si la app detecta que tú tenías cambios locales más recientes, marca el archivo **En conflicto** y te deja decidir.

**¿Qué significa el estado «Pendiente»?**
Que la app ha escrito cambios que aún no se han contrastado con Drive en una sincronización. Pulsa **Sincronizar** para resolverlo.

**¿Puedo editar los archivos directamente en Google?**
Puedes, pero respeta las zonas marcadas como gestionadas por la app (la portada y el bloque de datos): la app las regenera y tus ediciones manuales en esas zonas se perderían.
