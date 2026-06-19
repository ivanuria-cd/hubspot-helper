# Afegir una propietat al mapa

**Prerequisits:** tenir un projecte obert. Perquè la propietat es contrasti amb HubSpot, convé tenir el connector de HubSpot configurat.
**Temps estimat:** 5 minuts

El mapa de propietats és el llistat mestre de les propietats del projecte i la seva definició prevista a HubSpot. Pots incorporar propietats de dues maneres: important-les des de HubSpot en sincronitzar, o afegint-les manualment quan encara no existeixen al portal.

## Passos

1. Entra a **CRM → Propietats**.
2. Prem **Propietat** (botó de la barra d'accions). S'obre el diàleg «Afegeix propietat».
3. Emplena els camps:
   - **Nom tècnic (HubSpot)**: el nom intern de la propietat, per exemple `custom_tier`.
   - **Etiqueta**: el nom llegible que veuran els usuaris.
   - **Objecte**: a quin objecte pertany (contacts, deals o companies).
   - **Tipus**: el tipus de dada (text, número, data, enumeració, etc.).
   - **Tipus de camp**: com s'introdueix (text, select, checkbox…).
   - **Grup**: el grup de propietats de HubSpot on viurà.
   - **Descripció** (opcional).
4. Prem **Crea**. La propietat apareix a la taula amb estat **falta** (encara no existeix a HubSpot).
5. Fes clic sobre la fila per obrir el plafó lateral i associar-li orígens (vegeu el tutorial «Mapejar orígens i transformacions»).

## Resultat esperat

La propietat queda al mapa amb estat `falta`. En sincronitzar amb HubSpot es generarà un canvi pendent de tipus «Crear propietat» que podràs revisar i aplicar.

## Preguntes freqüents

**Crear la propietat aquí la crea a HubSpot?** No. L'app mai no escriu a HubSpot automàticament. Crear la propietat al portal requereix aplicar el canvi pendent de manera explícita.

**Puc editar una propietat importada de HubSpot?** Pots editar-ne l'etiqueta i la descripció; la resta de camps reflecteixen l'estat real del portal.
