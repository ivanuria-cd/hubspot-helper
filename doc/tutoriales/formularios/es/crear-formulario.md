# Crear un formulario nuevo (solo campos)

**Prerrequisitos:** al menos un origen y sus entradas de propiedades definidas en **CRM → Propiedades**.
**Tiempo estimado:** 4 minutos

El asistente crea un formulario de HubSpot definiendo únicamente sus campos a partir de un origen. No edita estilos, pasos, lógica condicional ni consentimiento legal (eso se gestiona en HubSpot).

## Pasos

1. Entra en **CRM → Formularios** y pulsa **Formulario**.
2. Escribe el **nombre** del formulario.
3. Elige el **objeto** de HubSpot (estándar o custom existente).
4. Marca uno o varios **orígenes**. La app preselecciona los campos que esos orígenes definen para el objeto.
5. Ajusta la lista de campos: marca o desmarca cada uno y edita su etiqueta y los indicadores **obligatorio**/**oculto**.
6. Pulsa **Crear**. Se genera un **cambio pendiente** de tipo «crear formulario» (no se escribe en HubSpot todavía).
7. Aplica el cambio desde **Cambios pendientes** (ver «Sincronizar los cambios con HubSpot»).

## Resultado esperado

Aparece un cambio pendiente «Crear formulario «…»». Al aplicarlo, el formulario se crea en HubSpot con tipo `hubspot` y queda asociado automáticamente a los orígenes elegidos.

## Preguntas frecuentes

**¿Por qué solo campos?** El alcance de la app es la estructura de campos y su relación con los orígenes; el diseño y la lógica del formulario se mantienen en HubSpot.

**¿Qué tipo de campo se usa?** El que corresponde al tipo de la propiedad de origen (por ejemplo, desplegable para una propiedad de opciones); la propiedad `email` de contacto usa el campo de email.
