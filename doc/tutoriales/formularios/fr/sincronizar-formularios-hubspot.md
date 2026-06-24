# Synchroniser les modifications avec HubSpot

**Prérequis :** au moins une modification de formulaires en attente (créée lors de la création d'un formulaire ou de l'ajout de champs manquants).
**Temps estimé :** 3 minutes

Aucune modification n'est écrite automatiquement dans HubSpot. Les modifications s'accumulent en attente et c'est vous qui les appliquez, en pouvant d'abord tester dans le sandbox puis en production.

## Étapes

1. Accédez à **CRM → Formulaires**.
2. Cliquez sur **Modifications en attente (N)**.
3. Examinez chaque modification : son résumé, le type d'opération et son état par environnement.
4. Vérifiez dans la barre supérieure quel environnement est actif.
5. Cliquez sur **Appliquer dans Sandbox** pour tester la modification sans toucher la production.
6. Lorsque vous êtes satisfait, cliquez sur **Appliquer en Production**.
7. Si une modification ne vous intéresse plus, cliquez sur **Rejeter**.

## Comprendre les états

- **sandbox ✓ / ✕** : si la modification a été appliquée ou non dans le sandbox.
- **production ✓ / ✕** : si la modification a été appliquée ou non en production.

Une modification n'est pas considérée comme terminée tant qu'elle n'a pas été appliquée en production.

## Résultat attendu

Après application, le formulaire est créé ou mis à jour dans HubSpot dans l'environnement choisi et la modification est marquée pour cet environnement.

## Questions fréquentes

**Que se passe-t-il s'il manque le scope `forms` ?** HubSpot renvoie une erreur de permissions (403) et l'application vous l'affiche ; la modification n'est pas marquée comme appliquée.

**Puis-je appliquer directement en production ?** Oui, mais il est recommandé de valider d'abord dans le sandbox.

**Peut-on supprimer des formulaires depuis l'application ?** Non. La suppression de formulaires est hors périmètre.
