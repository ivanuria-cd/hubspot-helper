# Appliquer des modifications dans HubSpot

**Prérequis :** avoir synchronisé la carte et avoir des modifications en attente. Pour valider dans le sandbox, avoir configuré cet environnement dans le connecteur HubSpot.
**Temps estimé :** 5 minutes

L'application n'écrit jamais automatiquement dans HubSpot. Les modifications nécessaires (créer des propriétés, ajuster des libellés, des options ou des types) sont présentées sous forme de liste que vous examinez et appliquez explicitement. La recommandation est d'appliquer d'abord dans le **sandbox**, de valider, et seulement ensuite en **production**.

## Étapes

1. Accédez à **CRM → Propriétés**.
2. Cliquez sur **Modifications en attente (n)** pour ouvrir la vue des modifications. Chaque carte affiche la propriété, l'opération et l'appel d'API correspondant.
3. Pour chaque modification :
   - Cliquez sur **Appliquer dans Sandbox** pour l'exécuter dans l'environnement de test. Une fois terminée avec succès, l'état passe à `sandbox ✓`.
   - Validez dans votre sandbox HubSpot que le résultat est celui attendu.
   - Cliquez sur **Appliquer en Production** pour l'exécuter dans le portail réel. L'état passe à `production ✓`.
4. Si une modification ne convient pas, cliquez sur **Rejeter** pour la retirer de la liste.

## Résultat attendu

Chaque modification reflète son état par environnement (sandbox et production). Une modification n'est pas considérée comme terminée tant qu'elle n'a pas été appliquée en production.

## Questions fréquentes

**Puis-je appliquer directement en production sans passer par le sandbox ?** Oui, mais ce n'est pas recommandé. Valider dans le sandbox réduit le risque d'erreurs dans le portail réel.

**Que se passe-t-il si l'appel à HubSpot échoue ?** La modification n'est pas marquée comme appliquée et vous verrez le message d'erreur. Corrigez la cause et réessayez.

**C'est un sujet sensible :** appliquer des modifications en production modifie le portail réel d'un client. Assurez-vous de l'environnement actif avant de confirmer.
