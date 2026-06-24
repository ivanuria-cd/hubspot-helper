# Examiner la couverture d'un formulaire

**Prérequis :** un formulaire associé à une ou plusieurs sources (voir « Associer un formulaire à une source »).
**Temps estimé :** 2 minutes

La couverture indique si un formulaire contient tous les champs que sa source exige pour un objet. Elle sert à détecter les formulaires incomplets avant de les publier.

## Étapes

1. Accédez à **CRM → Formulaires**.
2. Observez le badge de couverture de chaque formulaire dans le tableau.
3. Cliquez sur un formulaire pour ouvrir son panneau et voir le détail par source : combien de propriétés sont attendues, combien sont présentes et lesquelles manquent.

## Comprendre les états

- **complet** (badge vert citron) : tous les champs que la ou les source(s) définissent sont présents dans le formulaire.
- **N manquants** (badge avec avertissement) : il manque N champs définis par la source.
- **sans source** (badge gris) : le formulaire n'est associé à aucune source, il ne peut donc pas être évalué.

## Résultat attendu

Dans le panneau, chaque propriété attendue est marquée comme présente ou absente. S'il manque des champs, vous verrez le bouton **Ajouter les champs manquants**.

## Questions fréquentes

**La couverture est-elle calculée par objet ?** Oui. La comparaison se fait par objet + nom technique de la propriété ; un champ d'un autre objet ne compte pas.

**La couverture regarde-t-elle les valeurs ou seulement la présence du champ ?** Elle vérifie uniquement que le champ (la propriété de destination) existe dans le formulaire.
