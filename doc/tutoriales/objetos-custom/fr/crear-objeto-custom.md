# Créer un objet personnalisé

**Prérequis :** avoir configuré le connecteur HubSpot (au moins un environnement) et avoir ouvert un projet.
**Temps estimé :** 5 à 10 minutes

Les objets personnalisés vous permettent de représenter dans HubSpot des entités propres à votre activité (machines, contrats, véhicules…) qui n'entrent pas dans les objets standard. Cet écran crée la **définition** de l'objet ; les enregistrements (instances) se gèrent ensuite dans HubSpot.

## Étapes

1. Dans le menu latéral, sous **CRM**, ouvrez **Objets personnalisés**.
2. Cliquez sur **Objet personnalisé** pour ouvrir l'assistant de création.
3. **Identité** :
   - **Nom interne** : identifiant technique (uniquement minuscules, chiffres et tirets bas ; commence par une lettre). **Vous ne pourrez pas le modifier ensuite.**
   - **Libellé singulier** et **Libellé pluriel** : comment l'objet s'appellera dans l'interface (p. ex. « Machine » / « Machines »).
   - **Description** (facultatif) : à quoi sert l'objet.
4. **Propriétés initiales** : ajoutez les propriétés que l'objet aura. Pour chacune, indiquez **Nom interne** (identifiant technique), **Libellé**, **Type** et **Type de champ**. Le **Type de champ** est une liste déroulante qui s'ajuste automatiquement au type choisi (vous n'avez pas à deviner la valeur). Cochez **Unique** si cette propriété identifie de façon univoque chaque enregistrement. Utilisez **Ajouter une propriété** pour en ajouter d'autres.
5. **Affichage** (les listes déroulantes affichent le **libellé** de chaque propriété) :
   - **Propriété principale** : la propriété qui donne son nom à chaque enregistrement (obligatoire).
   - **Requises**, **Secondaires** et **Recherche** : sélectionnez, parmi les propriétés définies, lesquelles sont obligatoires, lesquelles s'affichent sous le nom et lesquelles sont indexées pour la recherche.
6. **Associations** (facultatif) : choisissez avec quels objets (contacts, entreprises, autres personnalisés) il pourra être lié.
7. Cliquez sur **Enregistrer**. L'objet est ajouté en tant que **brouillon** avec une modification en attente de type « créer ».

## Résultat attendu

L'objet apparaît dans la liste avec l'état **brouillon** (✕). Il n'existe pas encore dans HubSpot : pour le créer, allez dans ses modifications en attente et appliquez-le d'abord dans le sandbox puis en production (voir « Appliquer des modifications d'objets dans HubSpot »).

## Questions fréquentes

**Pourquoi ne puis-je pas changer le nom interne ensuite ?** C'est une restriction de HubSpot : le nom est immuable une fois l'objet créé. Les libellés, eux, peuvent être modifiés.

**Dois-je créer toutes les propriétés ici ?** Non. Vous pouvez créer l'objet avec le minimum et ajouter d'autres propriétés ensuite depuis l'écran **Propriétés**.
