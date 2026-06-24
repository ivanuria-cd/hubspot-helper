# Arquivar un obxecto custom

**Prerrequisitos:** ter un obxecto custom creado en HubSpot.
**Tempo estimado:** 3 minutos

Arquivar elimina a definición do obxecto en HubSpot. É unha acción destrutiva, por iso require dobre confirmación.

## Pasos

1. Abre **CRM → Obxectos custom** e fai clic no obxecto.
2. No panel de detalle, preme **Arquivar**. O botón pedirá unha segunda confirmación («Confirmar arquivado»).
3. Confirma. Xérase un cambio pendente de tipo «arquivar».
4. Aplica o cambio no contorno correspondente (sandbox ou produción).

## Resultado esperado

O obxecto pasa a estado **arquivado** unha vez aplicado. Se HubSpot rexeita a operación, verás a mensaxe de erro real (normalmente porque o obxecto aínda ten rexistros, asociacións ou propiedades).

## Preguntas frecuentes

**HubSpot dáme erro ao arquivar.** HubSpot só permite arquivar un obxecto cando se eliminaron antes todos os seus rexistros, asociacións e propiedades. Elimínaos en HubSpot e volve aplicar.

**Diferenza entre arquivar e borrar definitivamente (hard delete)?** Arquivar retira o obxecto pero conserva o seu nome reservado. O borrado definitivo (que libera o nome para reutilizalo) **non está dispoñible** desde a app nesta versión; faino desde HubSpot se o necesitas.

**Podo recuperar un obxecto arquivado?** A recuperación xestiónase desde HubSpot segundo as súas políticas; a app non a realiza.
