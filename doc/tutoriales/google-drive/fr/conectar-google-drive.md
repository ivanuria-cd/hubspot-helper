# Connecter Google Drive

**Prérequis :** avoir un projet ouvert dans l'application et un compte Google.
**Temps estimé :** 2 minutes.

## Étapes

1. Dans le menu latéral, ouvrez **Configuration**.
2. Dans **Connecteurs**, cliquez sur **Google Drive**.
3. Cliquez sur le bouton **Se connecter avec Google**. Le navigateur de votre système s'ouvrira sur l'écran d'autorisation de Google.
4. Choisissez le compte Google que vous souhaitez utiliser pour ce projet.
5. Examinez les permissions demandées et acceptez. L'application demande uniquement :
   — L'accès aux fichiers qu'elle crée elle-même ou que vous sélectionnez (pas à tout votre Drive).
   — Votre adresse e-mail, pour afficher avec quel compte vous êtes connecté.
6. Une fois terminé, revenez à l'application. Vous verrez l'état **Connecté** à côté de votre e-mail.

## Résultat attendu

L'écran de Google Drive affiche « Connecté en tant que votre-email@exemple.com » et la section **Dossier de travail** apparaît pour l'étape suivante.

## Questions fréquentes

**Pourquoi le navigateur s'ouvre-t-il et non une fenêtre dans l'application ?**
Pour des raisons de sécurité et de commodité : vous vous authentifiez ainsi dans le navigateur où vous avez déjà votre session Google et l'application ne voit jamais votre mot de passe.

**L'application peut-elle voir tous mes fichiers Drive ?**
Non. La permission est limitée (`drive.file`) : elle ne peut voir et modifier que les fichiers qu'elle crée ou ceux que vous choisissez explicitement.

**Où l'accès est-il enregistré ?**
Les identifiants sont stockés chiffrés dans le trousseau du système d'exploitation, jamais en texte clair ni dans le dépôt.
