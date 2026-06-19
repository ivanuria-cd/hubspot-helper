# Seleccionar la carpeta de trabajo

**Prerrequisitos:** haber conectado la cuenta de Google (ver «Conectar Google Drive»).
**Tiempo estimado:** 1 minuto.

## Pasos

1. En **Configuración > Conectores > Google Drive**, localiza la sección **Carpeta de trabajo**.
2. Pulsa **Seleccionar carpeta** (o **Cambiar carpeta** si ya había una).
3. Se abre el selector de carpetas de la app. Empieza en **Mi unidad**; haz clic en una carpeta para entrar y usa la ruta superior (migas de pan) para volver atrás.
4. Cuando estés dentro de la carpeta que quieres usar, pulsa **Seleccionar esta carpeta**.
5. La app mostrará el nombre de la carpeta elegida junto al icono de carpeta.

## Resultado esperado

La sección **Carpeta de trabajo** muestra el nombre de la carpeta seleccionada y se habilita la sección de **Sincronización**.

## Preguntas frecuentes

**¿Puedo cambiar la carpeta más adelante?**
Sí. Vuelve a esta pantalla y pulsa **Cambiar carpeta**. Ten en cuenta que los archivos gestionados viven dentro de la carpeta elegida.

**¿La app verá otros archivos que ya tenga esa carpeta?**
Solo gestionará los archivos que ella misma crea (marcados internamente como gestionados). El resto del contenido de la carpeta no se toca.

**¿Hace falta una API key de Google?**
No. El selector es propio de la app y navega tu Drive solo con el permiso OAuth. Para poder listar carpetas, la app pide el permiso de lectura de metadatos de Drive; por eso, al conectar, verás de nuevo la pantalla de consentimiento de Google.

**No veo mis unidades compartidas (Shared Drives).**
Esta versión del selector navega solo «Mi unidad». El soporte de unidades compartidas queda como ampliación futura.
