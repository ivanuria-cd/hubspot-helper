# Configurer les identifiants Google

**À quoi cela sert :** indiquer à l'application l'**ID client OAuth** (et, si votre client l'exige, le **secret**) utilisés pour se connecter à Google Drive. Auparavant, cela vivait uniquement dans le fichier `.env` ; vous pouvez désormais le faire depuis l'application elle-même.
**Temps estimé :** 2 minutes.

## Ce dont vous avez besoin depuis Google Cloud

Uniquement l'**ID client OAuth** du projet Google Cloud (une valeur qui se termine par `.apps.googleusercontent.com`). Aucune clé API n'est nécessaire : le sélecteur de dossier de l'application n'utilise pas le Google Picker.

> Si votre client OAuth est de type « Application de bureau » et exige un secret, ayez aussi à portée de main le **secret client**. Pour les clients avec PKCE, ce n'est généralement pas nécessaire.

## Étapes

1. Allez dans **Configuration > Connecteurs > Google Drive**.
2. Dans la carte **Identifiants Google Cloud**, collez votre **ID client** dans le champ correspondant.
3. (Facultatif) Saisissez le **secret client** si votre client l'exige.
4. Cliquez sur **Enregistrer**. La modification prend effet immédiatement : pas besoin de redémarrer.

## Origine de chaque identifiant

Chaque champ affiche une étiquette indiquant son origine :

- **App** — la valeur est enregistrée dans l'application (l'ID dans la configuration locale ; le secret dans le trousseau du système d'exploitation).
- **.env** — il n'y a pas de valeur dans l'application et celle du fichier `.env` est utilisée en secours.

La valeur configurée dans l'application est prioritaire sur le `.env`.

## Supprimer les identifiants

Cliquez sur **Supprimer** pour retirer de l'application l'ID et le secret. S'il existe une valeur dans `.env`, l'application l'utilisera de nouveau automatiquement.

## Questions fréquentes

**Où le secret est-il enregistré ?**
Dans le trousseau du système d'exploitation (le même endroit où sont stockés les jetons d'accès), jamais en texte clair. L'application indique seulement s'il est configuré, sans révéler sa valeur.

**Pourquoi ne demande-t-on plus de clé API ?**
La sélection de dossier utilise un sélecteur propre qui navigue dans votre Drive uniquement avec OAuth. Le Google Picker, qui exigeait bien une clé API, a été retiré.

**J'ai changé l'ID client et le compte reste connecté.**
La connexion existante est maintenue jusqu'à ce que vous vous déconnectiez. Si vous changez de projet Google Cloud, déconnectez-vous et reconnectez-vous pour autoriser avec les nouveaux identifiants.
