# Sincronizar o mapa con HubSpot

**Prerrequisitos:** conector de HubSpot configurado no proxecto.
**Tempo estimado:** 3 minutos

A sincronización compara a definición de propiedades do proxecto co estado real do portal de HubSpot e clasifica cada propiedade segundo o seu estado.

## Pasos

1. Entra en **CRM → Propiedades**.
2. Comproba na barra superior da app que contorno de HubSpot está activo (produción ou sandbox).
3. Preme **Sincronizar HubSpot**. A app le as propiedades do portal mediante a API de propiedades de HubSpot.
4. Ao rematar verás un resumo: cantas propiedades están ao día, cantas diverxentes e cantas sen crear.

## Entender os estados

- **exists** (badge verde lima): a propiedade existe en HubSpot e coincide coa definición do proxecto.
- **divergent** (badge gris): existe pero difire (por exemplo, distinta etiqueta ou opcións). Xera cambios pendentes.
- **missing** (badge gris escuro): non existe en HubSpot. Xera un cambio pendente de creación.

## Resultado esperado

A táboa mostra cada propiedade co seu badge de estado. As propiedades do portal que aínda non estaban no mapa impórtanse como `exists`. O mapa actualizado vólcase ao Google Sheets do proxecto.

## Preguntas frecuentes

**A sincronización modifica HubSpot?** Non. Só le. Calquera cambio no portal proponse como cambio pendente e require a túa confirmación.

**Sobre que obxectos sincroniza?** Sobre os obxectos presentes no mapa; se está baleiro, sobre contacts, deals e companies por defecto.
