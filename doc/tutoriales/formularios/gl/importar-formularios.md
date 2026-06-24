# Importar os formularios existentes

**Prerrequisitos:** conector de HubSpot configurado no proxecto (co scope `forms`).
**Tempo estimado:** 3 minutos

A importación trae á app todos os formularios do portal —tanto os da ferramenta nova como os capturados da ferramenta legacy— para poder asocialos a orixes e revisar a súa cobertura.

## Pasos

1. Entra en **CRM → Formularios**.
2. Comproba na barra superior que contorno de HubSpot está activo (produción ou sandbox).
3. Preme **Sincronizar HubSpot**. A app le os formularios mediante a Marketing Forms API v3 (e, como apoio, a API legacy v2 só de lectura para formularios moi antigos).
4. Ao rematar verás un resumo con cantos formularios se importaron e cantos se actualizaron.

## Entender os tipos de formulario

- **hubspot**: formulario de HubSpot (editor novo ou legacy). É o único tipo que a app pode crear.
- **captured**: formulario HTML externo capturado pola ferramenta de formularios non-HubSpot (a captura «legacy»).
- **flow**: formulario emerxente (pop-up).
- **blog_comment**: formulario de comentarios de blog.

## Resultado esperado

A táboa mostra cada formulario co seu tipo e o seu estado de cobertura. Podes buscar por nome e filtrar por tipo ou cobertura.

## Preguntas frecuentes

**A importación modifica HubSpot?** Non. Só le. O estado de verdade dos formularios segue sendo HubSpot.

**Por que non aparece un formulario?** Se é moi antigo pode que só estea na ferramenta legacy; a sincronización inténtao importar igualmente como só lectura.
