# Aplicar cambios de obxectos en HubSpot

**Prerrequisitos:** ter obxectos custom con cambios pendentes (creación, edición ou arquivado).
**Tempo estimado:** 3–5 minutos

A app nunca escribe en HubSpot de forma automática. Os cambios acumúlanse como **pendentes** e aplícaos ti, primeiro en **sandbox** para validar e logo en **produción**.

## Pasos

1. Abre **CRM → Obxectos custom**.
2. Preme **Cambios pendentes** (mostra o número entre parénteses) ou abre o panel dun obxecto concreto.
3. Por cada cambio verás a operación (crear / actualizar schema / arquivar) e o seu estado por contorno.
4. Preme **Aplicar en Sandbox**. Revisa no teu portal sandbox que o obxecto quedou como esperabas.
5. Cando esteas conforme, preme **Aplicar en Produción**.
6. Se un cambio xa non che interesa, preme **Descartar**.

## Resultado esperado

- Tras aplicar en sandbox, o estado do cambio mostra «sandbox ✓».
- Tras aplicar en produción, mostra «produción ✓».
- Ao crear, a app garda o identificador que HubSpot asigna **en cada contorno** (son distintos en sandbox e en produción).

## Preguntas frecuentes

**Por que hai que aplicar dúas veces (sandbox e produción)?** Para validar o cambio nun contorno seguro antes de tocar produción. Ademais, HubSpot asigna identificadores distintos por portal, así que cada contorno se xestiona por separado.

**Dáme erro ao actualizar ou arquivar nun contorno.** Asegúrate de que o obxecto xa existe nese contorno (debe terse creado alí primeiro). Se non, créao antes de aplicar outros cambios.

**O contorno activo importa?** A sincronización le do contorno activo de HubSpot. Cambia o contorno activo desde o conector se queres reconciliar contra o outro portal.
