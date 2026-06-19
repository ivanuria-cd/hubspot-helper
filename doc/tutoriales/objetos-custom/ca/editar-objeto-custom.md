# Editar un objecte personalitzat

**Prerequisits:** tenir com a mínim un objecte personalitzat creat o en esborrany.
**Temps estimat:** 3–5 minuts

Pots ajustar les etiquetes, les propietats de visualització, les requerides i les associacions d'un objecte. El **nom intern no es pot canviar**.

## Passos

1. Obre **CRM → Objectes personalitzats**.
2. Fes clic a l'objecte que vulguis modificar per obrir-ne el plafó de detall.
3. Prem **Edita**: s'obre l'assistent amb les dades actuals.
4. Canvia el que necessitis:
   - Etiquetes (singular/plural) i descripció.
   - Propietat principal, secundàries, requerides i de cerca.
   - Associacions amb altres objectes.
   - El camp **Nom intern** apareix bloquejat.
5. Prem **Desa**. Si l'objecte ja existeix a HubSpot i la definició difereix, es generarà un canvi pendent de tipus «actualitzar schema».

## Resultat esperat

Si hi ha diferències amb HubSpot, l'objecte passa a estat **divergeix** (⚠) i apareix un canvi pendent. Aplica'l a sandbox i producció per sincronitzar.

## Preguntes freqüents

**Vull afegir una propietat nova i marcar-la com a requerida.** Primer ha d'existir la propietat a HubSpot. Crea-la des de la pantalla de **Propietats** (o inclou-la en crear l'objecte) i després, a l'edició, marca-la com a requerida o de visualització. HubSpot no permet referenciar una propietat que encara no existeix.

**Puc canviar el tipus d'una propietat existent?** No des d'aquí: l'edició del schema no canvia tipus de propietats ja creades.
