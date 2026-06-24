# Créer une Private App dans HubSpot et obtenir le jeton

**Prérequis :** être administrateur (Super Admin) du portail HubSpot.
**Temps estimé :** 5 minutes.

L'application se connecte à HubSpot au moyen d'un *Private App Token* (PAT). C'est la méthode recommandée par HubSpot pour les intégrations internes et elle remplace les anciennes API Keys.

## Étapes

1. Connectez-vous à HubSpot avec un compte administrateur.
2. Allez dans **Paramètres** (l'icône d'engrenage, en haut à droite).
3. Dans le menu latéral, ouvrez **Intégrations → Applications privées**.
4. Cliquez sur **Créer une application privée**.
5. Dans l'onglet **Informations de base**, saisissez un nom (par exemple, `RevOps Assistant`) et une description.
6. Ouvrez l'onglet **Périmètres (scopes)** et activez, au minimum :
   - `crm.objects.contacts.read` — vérification de base de la connectivité.

   Ajoutez en outre les scopes requis par les fonctionnalités que vous comptez utiliser (chaque fonctionnalité documente les siens ; par exemple, l'automatisation requiert `automation`).

   Concrètement, le **consentement légal des formulaires** (types d'abonnement) requiert le scope **`communication_preferences.read`** (Subscription Preferences API), disponible sur n'importe quel compte. Sans lui, lister les types d'abonnement renvoie une erreur de permissions (403).

   > **Important :** notez quels scopes vous activez. L'application **ne peut ni lire ni afficher les scopes** d'une clé privée (HubSpot ne les expose pas via l'API), de sorte que la liste des permissions n'est visible qu'ici, dans HubSpot.
7. Cliquez sur **Créer l'application** et confirmez dans l'avertissement.
8. HubSpot affichera le **jeton d'accès**. Cliquez sur **Afficher le jeton** puis sur **Copier**.

## Résultat attendu

Vous avez dans le presse-papiers un jeton qui commence par `pat-` (par exemple, `pat-eu1-xxxxxxxx`). Conservez-le temporairement dans un endroit sûr ; vous le saisirez dans l'application dans le tutoriel suivant.

## Questions fréquentes

**Puis-je modifier les scopes plus tard ?** Oui. Revenez à l'application privée, ajustez les périmètres et enregistrez ; HubSpot génère la mise à jour sans changer le jeton.

**Où le jeton est-il enregistré dans l'application ?** Chiffré dans le trousseau (keychain) de votre système d'exploitation. Il n'est jamais affiché à l'écran ni écrit dans les journaux.

**J'ai un compte sandbox.** Répétez ces étapes dans le portail sandbox pour obtenir un jeton indépendant ; vous l'utiliserez dans l'environnement *Sandbox* de l'application.
