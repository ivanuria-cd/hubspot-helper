# Revisar la cobertura d'un formulari

**Prerequisits:** un formulari associat a un o diversos orígens (vegeu «Associar un formulari a un origen»).
**Temps estimat:** 2 minuts

La cobertura indica si un formulari conté tots els camps que el seu origen exigeix per a un objecte. Serveix per detectar formularis incomplets abans de publicar-los.

## Passos

1. Entra a **CRM → Formularis**.
2. Observa el distintiu de cobertura de cada formulari a la taula.
3. Fes clic a un formulari per obrir-ne el plafó i veure el detall per origen: quantes propietats s'esperen, quantes hi són presents i quines falten.

## Entendre els estats

- **complet** (distintiu llima): tots els camps que l'origen o els orígens defineixen hi són presents al formulari.
- **en falten N** (distintiu amb avís): falten N camps definits per l'origen.
- **sense origen** (distintiu gris): el formulari no està associat a cap origen, així que no es pot avaluar.

## Resultat esperat

Al plafó, cada propietat esperada apareix marcada com a present o com a absent. Si falten camps, veuràs el botó **Afegeix els camps que falten**.

## Preguntes freqüents

**La cobertura es calcula per objecte?** Sí. La comparació és per objecte + nom tècnic de la propietat; un camp d'un altre objecte no compta.

**La cobertura mira els valors o només la presència del camp?** Només comprova que el camp (la propietat destí) existeixi al formulari.
