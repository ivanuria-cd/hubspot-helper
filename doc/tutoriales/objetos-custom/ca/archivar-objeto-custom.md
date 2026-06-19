# Arxivar un objecte personalitzat

**Prerequisits:** tenir un objecte personalitzat creat a HubSpot.
**Temps estimat:** 3 minuts

Arxivar elimina la definició de l'objecte a HubSpot. És una acció destructiva, per això requereix doble confirmació.

## Passos

1. Obre **CRM → Objectes personalitzats** i fes clic a l'objecte.
2. Al plafó de detall, prem **Arxiva**. El botó demanarà una segona confirmació («Confirma l'arxivat»).
3. Confirma. Es genera un canvi pendent de tipus «arxivar».
4. Aplica el canvi a l'entorn corresponent (sandbox o producció).

## Resultat esperat

L'objecte passa a estat **arxivat** un cop aplicat. Si HubSpot rebutja l'operació, veuràs el missatge d'error real (normalment perquè l'objecte encara té registres, associacions o propietats).

## Preguntes freqüents

**HubSpot em dona error en arxivar.** HubSpot només permet arxivar un objecte quan s'han eliminat abans tots els seus registres, associacions i propietats. Elimina'ls a HubSpot i torna a aplicar.

**Diferència entre arxivar i esborrar definitivament (hard delete)?** Arxivar retira l'objecte però conserva el seu nom reservat. L'esborrat definitiu (que allibera el nom per reutilitzar-lo) **no està disponible** des de l'app en aquesta versió; fes-ho des de HubSpot si ho necessites.

**Puc recuperar un objecte arxivat?** La recuperació es gestiona des de HubSpot segons les seves polítiques; l'app no la realitza.
