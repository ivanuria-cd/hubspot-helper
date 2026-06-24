# Crear un formulario novo (só campos)

**Prerrequisitos:** polo menos unha orixe e as súas entradas de propiedades definidas en **CRM → Propiedades**.
**Tempo estimado:** 4 minutos

O asistente crea un formulario de HubSpot definindo unicamente os seus campos a partir dunha orixe. Non edita estilos, pasos, lóxica condicional nin consentimento legal (iso xestiónase en HubSpot).

## Pasos

1. Entra en **CRM → Formularios** e preme **Formulario**.
2. Escribe o **nome** do formulario.
3. Elixe o **obxecto** de HubSpot (estándar ou custom existente).
4. Marca unha ou varias **orixes**. A app preselecciona os campos que esas orixes definen para o obxecto.
5. Axusta a lista de campos: marca ou desmarca cada un e edita a súa etiqueta e os indicadores **obrigatorio**/**oculto**.
6. Preme **Crear**. Xérase un **cambio pendente** de tipo «crear formulario» (non se escribe en HubSpot aínda).
7. Aplica o cambio desde **Cambios pendentes** (ver «Sincronizar os cambios con HubSpot»).

## Resultado esperado

Aparece un cambio pendente «Crear formulario «…»». Ao aplicalo, o formulario créase en HubSpot con tipo `hubspot` e queda asociado automaticamente ás orixes elixidas.

## Preguntas frecuentes

**Por que só campos?** O alcance da app é a estrutura de campos e a súa relación coas orixes; o deseño e a lóxica do formulario mantéñense en HubSpot.

**Que tipo de campo se usa?** O que corresponde ao tipo da propiedade de orixe (por exemplo, despregable para unha propiedade de opcións); a propiedade `email` de contacto usa o campo de email.
