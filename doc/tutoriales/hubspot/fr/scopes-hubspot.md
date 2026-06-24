# Scopes de HubSpot par fonctionnalité

**Prérequis :** être administrateur (Super Admin) du portail HubSpot.
**Temps estimé :** 10 minutes.

Ce tutoriel explique comment créer le *Private App Token* (PAT) avec lequel l'application se connecte à HubSpot et quels *scopes* (périmètres de permission) activer selon les fonctionnalités que vous comptez utiliser. Pour le détail pas à pas de la création, consultez également « Créer une Private App dans HubSpot et obtenir le jeton ».

> **Note importante :** les scopes d'un Private App Token **ne peuvent pas être consultés via l'API**. L'application ne détecte ni ne valide les permissions à l'avance. Si vous en activez trop peu, HubSpot renvoie une erreur `403` sur l'opération concrète en indiquant le scope manquant. C'est pourquoi il vaut mieux activer d'un coup l'ensemble groupé de la fin.

## Créer la clé PAT

1. Connectez-vous à HubSpot avec un compte administrateur.
2. Allez dans **Paramètres** (icône d'engrenage, en haut à droite).
3. Dans le menu latéral, ouvrez **Intégrations → Applications privées**.
4. Cliquez sur **Créer une application privée**.
5. Dans **Informations de base**, saisissez un nom (par exemple, `RevOps Assistant`) et une description.
6. Ouvrez l'onglet **Périmètres (scopes)** et activez ceux dont vous avez besoin (voir les tableaux suivants).
7. Cliquez sur **Créer l'application** et confirmez.
8. Cliquez sur **Afficher le jeton** et **Copier**. Le jeton commence par `pat-` (par exemple, `pat-eu1-xxxxxxxx`).

Liens officiels de HubSpot :

- Créer des applications privées : https://knowledge.hubspot.com/integrations/create-private-apps
- Référence des scopes : https://developers.hubspot.com/docs/guides/apps/authentication/scopes
- Applications privées (guide pour développeurs) : https://developers.hubspot.com/docs/guides/apps/private-apps/overview

## Scopes par fonctionnalité

### Connexion de base (toujours)

| Scope | Motif |
|-------|--------|
| `crm.objects.contacts.read` | Vérification de la connectivité du connecteur de base |

### Gestion des propriétés

| Scope | Motif |
|-------|--------|
| `crm.schemas.contacts.read` | Lire les propriétés des contacts |
| `crm.schemas.contacts.write` | Créer/modifier les propriétés des contacts |
| `crm.schemas.deals.read` | Lire les propriétés des deals |
| `crm.schemas.deals.write` | Créer/modifier les propriétés des deals |
| `crm.schemas.companies.read` | Lire les propriétés des companies |
| `crm.schemas.companies.write` | Créer/modifier les propriétés des companies |

### Objets personnalisés

| Scope | Motif |
|-------|--------|
| `crm.schemas.custom.read` | Lire les définitions des objets personnalisés (CRM Schemas API) |
| `crm.schemas.custom.write` | Créer/modifier/archiver les définitions des objets personnalisés |

### Gestion des formulaires

| Scope | Motif |
|-------|--------|
| `forms` | Lire, créer et mettre à jour des formulaires (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Résoudre les propriétés et objets de destination pour la couverture (partagé avec Propriétés) |
| `communication_preferences.read` | Lister les types d'abonnement pour le consentement légal (Subscription Preferences API). Sans lui, HubSpot renvoie `403` |

### Tableau de bord d'état et Vue d'ensemble du CRM

Ne requièrent pas de nouveaux scopes : ils réutilisent ceux déjà accordés par les fonctionnalités précédentes.

## Ensemble groupé (tous les cas)

Pour activer toute l'application d'un coup, activez ces onze scopes :

| Scope | Utilisé par |
|-------|-----------|
| `crm.objects.contacts.read` | Connexion de base |
| `crm.schemas.contacts.read` | Propriétés, Formulaires |
| `crm.schemas.contacts.write` | Propriétés |
| `crm.schemas.deals.read` | Propriétés |
| `crm.schemas.deals.write` | Propriétés |
| `crm.schemas.companies.read` | Propriétés |
| `crm.schemas.companies.write` | Propriétés |
| `crm.schemas.custom.read` | Objets personnalisés |
| `crm.schemas.custom.write` | Objets personnalisés |
| `forms` | Formulaires |
| `communication_preferences.read` | Formulaires (consentement légal) |

## Résultat attendu

Vous avez une Private App avec les scopes des fonctionnalités que vous allez utiliser et un jeton `pat-…` copié, prêt à être saisi dans l'application (voir « Connecter HubSpot »).

## Questions fréquentes

**Puis-je modifier les scopes plus tard ?** Oui. Revenez à l'application privée, ajustez les périmètres et enregistrez ; le jeton ne change pas.

**Pourquoi l'application ne me prévient-elle pas qu'il manque un scope avant d'opérer ?** Parce que HubSpot n'expose pas les scopes d'un PAT via l'API. L'échec n'apparaît (sous forme de `403`) qu'au moment d'exécuter l'opération qui le nécessite.

**Et si je ne vais utiliser qu'une seule fonctionnalité ?** Activez la section « Connexion de base » plus la section de cette fonctionnalité. Vous pouvez ajouter le reste ensuite sans régénérer le jeton.
