# Ajouter une propriété à la carte

**Prérequis :** avoir un projet ouvert. Pour que la propriété soit comparée avec HubSpot, il convient d'avoir le connecteur HubSpot configuré.
**Temps estimé :** 5 minutes

La carte des propriétés est la liste maîtresse des propriétés du projet et de leur définition prévue dans HubSpot. Vous pouvez incorporer des propriétés de deux manières : en les important depuis HubSpot lors de la synchronisation, ou en les ajoutant manuellement lorsqu'elles n'existent pas encore dans le portail.

## Étapes

1. Accédez à **CRM → Propriétés**.
2. Cliquez sur **Propriété** (bouton de la barre d'actions). Le dialogue « Ajouter une propriété » s'ouvre.
3. Remplissez les champs :
   - **Nom technique (HubSpot)** : le nom interne de la propriété, par exemple `custom_tier`.
   - **Libellé** : le nom lisible que verront les utilisateurs.
   - **Objet** : à quel objet elle appartient (contacts, deals ou companies).
   - **Type** : le type de donnée (texte, nombre, date, énumération, etc.).
   - **Type de champ** : comment elle se saisit (text, select, checkbox…).
   - **Groupe** : le groupe de propriétés HubSpot où elle vivra.
   - **Description** (facultatif).
4. Cliquez sur **Créer**. La propriété apparaît dans le tableau avec l'état **missing** (elle n'existe pas encore dans HubSpot).
5. Cliquez sur la ligne pour ouvrir le panneau latéral et lui associer des sources (voir le tutoriel « Mapper les sources et les transformations »).

## Résultat attendu

La propriété reste dans la carte avec l'état `missing`. Lors de la synchronisation avec HubSpot, une modification en attente de type « Créer une propriété » sera générée, que vous pourrez examiner et appliquer.

## Questions fréquentes

**Créer la propriété ici la crée-t-elle dans HubSpot ?** Non. L'application n'écrit jamais automatiquement dans HubSpot. Créer la propriété dans le portail nécessite d'appliquer explicitement la modification en attente.

**Puis-je modifier une propriété importée de HubSpot ?** Vous pouvez modifier son libellé et sa description ; les autres champs reflètent l'état réel du portail.
