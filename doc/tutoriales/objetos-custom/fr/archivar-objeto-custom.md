# Archiver un objet personnalisé

**Prérequis :** avoir un objet personnalisé créé dans HubSpot.
**Temps estimé :** 3 minutes

L'archivage supprime la définition de l'objet dans HubSpot. C'est une action destructive, c'est pourquoi elle requiert une double confirmation.

## Étapes

1. Ouvrez **CRM → Objets personnalisés** et cliquez sur l'objet.
2. Dans le panneau de détail, cliquez sur **Archiver**. Le bouton demandera une deuxième confirmation (« Confirmer l'archivage »).
3. Confirmez. Une modification en attente de type « archiver » est générée.
4. Appliquez la modification dans l'environnement correspondant (sandbox ou production).

## Résultat attendu

L'objet passe à l'état **archivé** une fois appliqué. Si HubSpot rejette l'opération, vous verrez le message d'erreur réel (généralement parce que l'objet a encore des enregistrements, des associations ou des propriétés).

## Questions fréquentes

**HubSpot me renvoie une erreur lors de l'archivage.** HubSpot ne permet d'archiver un objet que lorsque tous ses enregistrements, associations et propriétés ont été supprimés au préalable. Supprimez-les dans HubSpot et réappliquez.

**Quelle est la différence entre archiver et supprimer définitivement (hard delete) ?** L'archivage retire l'objet mais conserve son nom réservé. La suppression définitive (qui libère le nom pour le réutiliser) **n'est pas disponible** depuis l'application dans cette version ; faites-le depuis HubSpot si vous en avez besoin.

**Puis-je récupérer un objet archivé ?** La récupération se gère depuis HubSpot selon ses politiques ; l'application ne la réalise pas.
