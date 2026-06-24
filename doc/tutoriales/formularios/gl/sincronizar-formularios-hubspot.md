# Sincronizar os cambios con HubSpot

**Prerrequisitos:** polo menos un cambio pendente de formularios (creado ao crear un formulario ou ao engadir campos que faltan).
**Tempo estimado:** 3 minutos

Ningún cambio se escribe en HubSpot automaticamente. Os cambios acumúlanse como pendentes e aplícaos ti, podendo probar primeiro en sandbox e logo en produción.

## Pasos

1. Entra en **CRM → Formularios**.
2. Preme **Cambios pendentes (N)**.
3. Revisa cada cambio: o seu resumo, o tipo de operación e o seu estado por contorno.
4. Comproba na barra superior que contorno está activo.
5. Preme **Aplicar en Sandbox** para probar o cambio sen tocar produción.
6. Cando esteas conforme, preme **Aplicar en Produción**.
7. Se un cambio xa non interesa, preme **Descartar**.

## Entender os estados

- **sandbox ✓ / ✕**: se o cambio se aplicou ou non en sandbox.
- **produción ✓ / ✕**: se o cambio se aplicou ou non en produción.

Un cambio non se considera completado ata que se aplica en produción.

## Resultado esperado

Tras aplicar, o formulario créase ou actualízase en HubSpot no contorno elixido e o cambio queda marcado para ese contorno.

## Preguntas frecuentes

**Que pasa se falta o scope `forms`?** HubSpot devolve un erro de permisos (403) e a app móstracho; o cambio non se marca como aplicado.

**Podo aplicar directo a produción?** Si, pero recoméndase validar antes en sandbox.

**Pódense borrar formularios desde a app?** Non. O borrado de formularios queda fóra de alcance.
