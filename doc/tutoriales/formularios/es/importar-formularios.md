# Importar los formularios existentes

**Prerrequisitos:** conector de HubSpot configurado en el proyecto (con el scope `forms`).
**Tiempo estimado:** 3 minutos

La importación trae a la app todos los formularios del portal —tanto los de la herramienta nueva como los capturados de la herramienta legacy— para poder asociarlos a orígenes y revisar su cobertura.

## Pasos

1. Entra en **CRM → Formularios**.
2. Comprueba en la barra superior qué entorno de HubSpot está activo (producción o sandbox).
3. Pulsa **Sincronizar HubSpot**. La app lee los formularios mediante la Marketing Forms API v3 (y, como apoyo, la API legacy v2 solo de lectura para formularios muy antiguos).
4. Al terminar verás un resumen con cuántos formularios se han importado y cuántos se han actualizado.

## Entender los tipos de formulario

- **hubspot**: formulario de HubSpot (editor nuevo o legacy). Es el único tipo que la app puede crear.
- **captured**: formulario HTML externo capturado por la herramienta de formularios no-HubSpot (la captura «legacy»).
- **flow**: formulario emergente (pop-up).
- **blog_comment**: formulario de comentarios de blog.

## Resultado esperado

La tabla muestra cada formulario con su tipo y su estado de cobertura. Puedes buscar por nombre y filtrar por tipo o cobertura.

## Preguntas frecuentes

**¿La importación modifica HubSpot?** No. Solo lee. El estado de verdad de los formularios sigue siendo HubSpot.

**¿Por qué no aparece un formulario?** Si es muy antiguo puede que solo esté en la herramienta legacy; la sincronización lo intenta importar igualmente como solo lectura.
