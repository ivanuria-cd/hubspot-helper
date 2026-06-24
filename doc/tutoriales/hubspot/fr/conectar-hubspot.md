# Connecter l'application à HubSpot

**Prérequis :** avoir un jeton d'application privée (voir *Créer une Private App dans HubSpot et obtenir le jeton*) et un projet créé dans l'application.
**Temps estimé :** 2 minutes.

## Étapes

1. Ouvrez votre projet dans l'application.
2. Dans le menu latéral, cliquez sur **Configuration**.
3. Dans la section **Connecteurs**, cliquez sur **HubSpot**.
4. Assurez-vous d'avoir sélectionné l'onglet de l'environnement que vous souhaitez configurer : **Production** ou **Sandbox**.
5. Collez le jeton dans le champ **Private App Token**.
6. Cliquez sur **Enregistrer**.

L'application vérifie le jeton auprès de HubSpot et, s'il est valide, affiche l'état de la connexion.

## Résultat attendu

- Un indicateur **Connecté** (badge vert citron).
- La ligne **Portail : _nom_ (_id_)** avec les données de votre compte HubSpot.
- La **version d'API** utilisée.

Si le jeton n'est pas valide, vous verrez un message d'erreur expliquant le motif et la connexion ne sera pas enregistrée.

> **À propos des permissions (scopes) :** l'application n'affiche pas les scopes du jeton. Les clés privées de HubSpot ne permettent pas de consulter leurs périmètres via l'API, l'application ne peut donc pas les lister. Examinez et ajustez les scopes directement dans HubSpot, au sein de l'application privée (voir *Créer une Private App dans HubSpot et obtenir le jeton*). S'il manque une permission à une fonctionnalité, vous le constaterez en l'utilisant, pas sur cet écran.

## Questions fréquentes

**Mon jeton est-il visible quelque part ?** Non. Le champ est de type mot de passe, le jeton est enregistré chiffré dans le trousseau du système et est masqué (`[REDACTED]`) dans tout journal.

**Comment déconnecter le portail ?** Sur le même écran, avec l'environnement sélectionné, cliquez sur **Révoquer**. Le jeton de cet environnement est supprimé.

**Que se passe-t-il si le jeton expire ou si je le change ?** Recollez le nouveau jeton et cliquez sur **Enregistrer** ; l'application revalide et met à jour les données du portail.
