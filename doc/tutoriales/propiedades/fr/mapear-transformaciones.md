# Mapper les sources et les transformations

**Prérequis :** avoir au moins une propriété dans la carte et une source créée.
**Temps estimé :** 7 minutes

Un mappage relie une propriété à une source de données, en indiquant de quel champ du système source elle provient et quelles transformations de valeurs il faut appliquer pour qu'elles correspondent à HubSpot.

## Étapes

1. Accédez à **CRM → Propriétés** et cliquez sur la propriété que vous souhaitez mapper. Le panneau latéral s'ouvre.
2. Dans la section **Sources mappées**, cliquez sur **Ajouter une source**.
3. Dans le dialogue « Mapper une source » :
   - **Source** : choisissez la source de données.
   - **Champ source** : le nom du champ dans le système source, par exemple `Account_Tier__c`.
   - **Transformations** : cliquez sur **Ajouter une règle** pour chaque équivalence de valeur. À gauche, la valeur telle qu'elle arrive de la source ; à droite, la valeur valide dans HubSpot. Par exemple `GOLD → enterprise`.
   - **Notes** (facultatif) : toute précision pour l'équipe.
4. Cliquez sur **Enregistrer**. Le mappage apparaît dans le panneau et dans la colonne « Sources » du tableau.
5. Pour modifier ou supprimer un mappage, utilisez les icônes de crayon et de corbeille à côté de lui dans le panneau.

## Résultat attendu

Le mappage est enregistré et reflété dans la feuille `03_Mapeo_Origenes` du Google Sheets. Les transformations sont stockées sous forme de paires valeur source → valeur HubSpot, prêtes à être exportées dans le contrat JSON de la source.

## Questions fréquentes

**Puis-je définir une logique complexe dans les transformations ?** Non. Pour des raisons de sécurité, seules les équivalences de valeur (mappages) sont admises, jamais de scripts.

**Une propriété peut-elle avoir plusieurs sources ?** Oui. Ajoutez un mappage par source qui alimente cette propriété.
