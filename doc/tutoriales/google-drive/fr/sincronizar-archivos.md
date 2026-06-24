# Synchroniser les fichiers

**Prérequis :** compte Google connecté et dossier de travail sélectionné.
**Temps estimé :** 1 minute.

## Étapes

1. Ouvrez **Configuration > Connecteurs > Google Drive**.
2. Dans la section **Synchronisation**, vous verrez la date de la dernière synchronisation.
3. Cliquez sur **Synchroniser** pour récupérer l'état actuel des fichiers depuis Google Drive.
4. Examinez la liste des **Fichiers gérés** : chaque fichier affiche son état (Synchronisé, En conflit ou En attente).
5. Si un avertissement de conflit apparaît, décidez quelle version conserver avant de continuer à travailler.

## Résultat attendu

La date de dernière synchronisation se met à jour et chaque fichier géré affiche son état. S'il n'y a pas de conflits, ils apparaissent tous comme **Synchronisé**.

## Questions fréquentes

**Quand l'application se synchronise-t-elle ?**
À l'ouverture du projet, l'application compare son état avec Google Drive, et vous pouvez forcer une synchronisation manuelle à tout moment avec le bouton **Synchroniser**, sans redémarrer l'application.

**Quelle version l'emporte en cas de différences ?**
Google Drive est la source de vérité : si seule la version de Drive a changé, c'est celle-ci qui est adoptée. Si l'application détecte que vous aviez des modifications locales plus récentes, elle marque le fichier **En conflit** et vous laisse décider.

**Que signifie l'état « En attente » ?**
Que l'application a écrit des modifications qui n'ont pas encore été comparées à Drive lors d'une synchronisation. Cliquez sur **Synchroniser** pour le résoudre.

**Puis-je modifier les fichiers directement dans Google ?**
Vous le pouvez, mais respectez les zones marquées comme gérées par l'application (la couverture et le bloc de données) : l'application les régénère et vos modifications manuelles dans ces zones seraient perdues.
