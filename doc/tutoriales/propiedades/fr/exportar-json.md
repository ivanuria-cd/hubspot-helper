# Exporter le JSON par source

**Prérequis :** avoir au moins une source avec des propriétés mappées.
**Temps estimé :** 2 minutes

L'exportation génère un fichier JSON contenant les propriétés associées à une source, y compris le champ source et les règles de transformation. C'est un contrat d'intégration conçu pour que l'équipe de développement sache exactement quoi envoyer à HubSpot et comment transformer chaque valeur.

## Étapes

1. Accédez à **CRM → Propriétés**.
2. Cliquez sur **Exporter le JSON**. Un menu se déploie avec un élément par source du projet.
3. Sélectionnez la source que vous souhaitez exporter.
4. Le navigateur télécharge un fichier portant le nom `{nom-source}_{date}.json`.

## Ce que contient le fichier

- `schema_version` : version du contrat (actuellement 1).
- `origin` : identifiant, nom et type de la source.
- `exported_at` : date et heure de l'exportation.
- `properties` : pour chaque propriété mappée à cette source, son nom technique, son libellé, son objet, son type, le champ source et les transformations (valeur source → valeur HubSpot).

## Résultat attendu

Un fichier JSON téléchargé, prêt à être partagé avec l'équipe de développement ou à joindre à la documentation de l'intégration.

## Questions fréquentes

**Le JSON est-il enregistré dans Google Drive ?** Non. L'exportation est générée à la demande et téléchargée localement ; elle n'est pas stockée automatiquement dans Drive.

**Pourquoi exporter par source et non tout ensemble ?** Chaque source correspond généralement à une intégration différente ; le contrat par source est précisément ce dont a besoin celui qui développe cette intégration.
