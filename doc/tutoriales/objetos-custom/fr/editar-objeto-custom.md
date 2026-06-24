# Modifier un objet personnalisé

**Prérequis :** avoir au moins un objet personnalisé créé ou en brouillon.
**Temps estimé :** 3 à 5 minutes

Vous pouvez ajuster les libellés, les propriétés d'affichage, les propriétés requises et les associations d'un objet. Le **nom interne ne peut pas être modifié**.

## Étapes

1. Ouvrez **CRM → Objets personnalisés**.
2. Cliquez sur l'objet que vous souhaitez modifier pour ouvrir son panneau de détail.
3. Cliquez sur **Modifier** : l'assistant s'ouvre avec les données actuelles.
4. Modifiez ce dont vous avez besoin :
   - Libellés (singulier/pluriel) et description.
   - Propriété principale, secondaires, requises et de recherche.
   - Associations avec d'autres objets.
   - Le champ **Nom interne** apparaît verrouillé.
5. Cliquez sur **Enregistrer**. Si l'objet existe déjà dans HubSpot et que la définition diffère, une modification en attente de type « mettre à jour le schéma » sera générée.

## Résultat attendu

S'il y a des différences avec HubSpot, l'objet passe à l'état **diverge** (⚠) et une modification en attente apparaît. Appliquez-la dans le sandbox et en production pour synchroniser.

## Questions fréquentes

**Je veux ajouter une nouvelle propriété et la marquer comme requise.** La propriété doit d'abord exister dans HubSpot. Créez-la depuis l'écran **Propriétés** (ou incluez-la lors de la création de l'objet) puis, lors de l'édition, marquez-la comme requise ou d'affichage. HubSpot ne permet pas de référencer une propriété qui n'existe pas encore.

**Puis-je changer le type d'une propriété existante ?** Pas depuis ici : l'édition du schéma ne change pas les types des propriétés déjà créées.
