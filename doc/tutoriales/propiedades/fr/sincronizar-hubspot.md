# Synchroniser la carte avec HubSpot

**Prérequis :** connecteur HubSpot configuré dans le projet.
**Temps estimé :** 3 minutes

La synchronisation compare la définition des propriétés du projet avec l'état réel du portail HubSpot et classe chaque propriété selon son état.

## Étapes

1. Accédez à **CRM → Propriétés**.
2. Vérifiez dans la barre supérieure de l'application quel environnement HubSpot est actif (production ou sandbox).
3. Cliquez sur **Synchroniser HubSpot**. L'application lit les propriétés du portail via l'API des propriétés de HubSpot.
4. Une fois terminé, vous verrez un résumé : combien de propriétés sont à jour, combien sont divergentes et combien ne sont pas encore créées.

## Comprendre les états

- **exists** (badge vert citron) : la propriété existe dans HubSpot et coïncide avec la définition du projet.
- **divergent** (badge gris) : elle existe mais diffère (par exemple, libellé ou options différents). Génère des modifications en attente.
- **missing** (badge gris foncé) : elle n'existe pas dans HubSpot. Génère une modification en attente de création.

## Résultat attendu

Le tableau affiche chaque propriété avec son badge d'état. Les propriétés du portail qui n'étaient pas encore dans la carte sont importées comme `exists`. La carte mise à jour est exportée vers le Google Sheets du projet.

## Questions fréquentes

**La synchronisation modifie-t-elle HubSpot ?** Non. Elle ne fait que lire. Toute modification dans le portail est proposée comme modification en attente et nécessite votre confirmation.

**Sur quels objets synchronise-t-elle ?** Sur les objets présents dans la carte ; si elle est vide, sur contacts, deals et companies par défaut.
