# Importer les formulaires existants

**Prérequis :** connecteur HubSpot configuré dans le projet (avec le scope `forms`).
**Temps estimé :** 3 minutes

L'importation apporte à l'application tous les formulaires du portail —aussi bien ceux du nouvel outil que ceux capturés depuis l'outil legacy— afin de pouvoir les associer à des sources et examiner leur couverture.

## Étapes

1. Accédez à **CRM → Formulaires**.
2. Vérifiez dans la barre supérieure quel environnement HubSpot est actif (production ou sandbox).
3. Cliquez sur **Synchroniser HubSpot**. L'application lit les formulaires via la Marketing Forms API v3 (et, en appui, l'API legacy v2 en lecture seule pour les formulaires très anciens).
4. Une fois terminé, vous verrez un résumé indiquant combien de formulaires ont été importés et combien ont été mis à jour.

## Comprendre les types de formulaire

- **hubspot** : formulaire HubSpot (éditeur nouveau ou legacy). C'est le seul type que l'application peut créer.
- **captured** : formulaire HTML externe capturé par l'outil de formulaires non-HubSpot (la capture « legacy »).
- **flow** : formulaire pop-up.
- **blog_comment** : formulaire de commentaires de blog.

## Résultat attendu

Le tableau affiche chaque formulaire avec son type et son état de couverture. Vous pouvez rechercher par nom et filtrer par type ou par couverture.

## Questions fréquentes

**L'importation modifie-t-elle HubSpot ?** Non. Elle ne fait que lire. L'état de référence des formulaires reste HubSpot.

**Pourquoi un formulaire n'apparaît-il pas ?** S'il est très ancien, il se peut qu'il ne soit que dans l'outil legacy ; la synchronisation tente quand même de l'importer en lecture seule.
