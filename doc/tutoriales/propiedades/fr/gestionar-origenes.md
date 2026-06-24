# Gérer les sources de données

**Prérequis :** avoir un projet ouvert.
**Temps estimé :** 5 minutes

Une **source** représente d'où proviennent les données d'une propriété : une intégration, une migration ponctuelle, la saisie manuelle par des utilisateurs, ou un workflow de HubSpot. Bien définir les sources vous permet de documenter la carte des propriétés et d'exporter des contrats d'intégration par source.

## Étapes

1. Dans le menu latéral, accédez à **CRM → Propriétés**.
2. Cliquez sur le bouton **Sources (n)** de la barre supérieure. La fenêtre « Gérer les sources » s'ouvre.
3. Vous verrez la liste des sources existantes. Pour en créer une nouvelle, remplissez le formulaire du bas :
   - **Nom** : un nom descriptif, par exemple « Migration Salesforce Q1 ».
   - **Type** : choisissez entre Intégration, Migration, Utilisateur ou Workflow.
   - **Description** (facultatif) : contexte supplémentaire.
4. Cliquez sur **Ajouter une source**. La source apparaît dans la liste à l'instant.
5. Pour supprimer une source, cliquez sur l'icône de corbeille à côté d'elle. En la supprimant, ses mappages avec les propriétés sont également effacés.
6. Fermez la fenêtre avec **Fermer**.

## Quand utiliser chaque type

- **Intégration** : la donnée arrive d'un système connecté de façon continue (par exemple, un ERP synchronisé).
- **Migration** : la donnée a été chargée une fois depuis un autre système (par exemple, lors d'une migration depuis Salesforce).
- **Utilisateur** : elle est saisie manuellement par des personnes dans HubSpot.
- **Workflow** : elle est calculée ou attribuée par un workflow de HubSpot.

## Résultat attendu

Les sources sont enregistrées dans le projet et reflétées dans la feuille `01_Origenes` du Google Sheets de la carte des propriétés. À partir de maintenant, vous pouvez les associer à des propriétés.

## Questions fréquentes

**Puis-je changer le type d'une source plus tard ?** Oui, les champs Nom, Type et Description sont modifiables.

**Qu'arrive-t-il aux propriétés mappées si je supprime la source ?** Les mappages de cette source sont supprimés, mais les propriétés demeurent.
