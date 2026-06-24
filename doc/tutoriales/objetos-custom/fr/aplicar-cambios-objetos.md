# Appliquer des modifications d'objets dans HubSpot

**Prérequis :** avoir des objets personnalisés avec des modifications en attente (création, édition ou archivage).
**Temps estimé :** 3 à 5 minutes

L'application n'écrit jamais automatiquement dans HubSpot. Les modifications s'accumulent en tant que **modifications en attente** et c'est vous qui les appliquez, d'abord dans le **sandbox** pour valider, puis en **production**.

## Étapes

1. Ouvrez **CRM → Objets personnalisés**.
2. Cliquez sur **Modifications en attente** (le nombre est indiqué entre parenthèses) ou ouvrez le panneau d'un objet précis.
3. Pour chaque modification, vous verrez l'opération (créer / mettre à jour le schéma / archiver) et son état par environnement.
4. Cliquez sur **Appliquer dans Sandbox**. Vérifiez dans votre portail sandbox que l'objet correspond à vos attentes.
5. Lorsque vous êtes satisfait, cliquez sur **Appliquer en Production**.
6. Si une modification ne vous intéresse plus, cliquez sur **Rejeter**.

## Résultat attendu

- Après application dans le sandbox, l'état de la modification affiche « sandbox ✓ ».
- Après application en production, il affiche « production ✓ ».
- Lors de la création, l'application enregistre l'identifiant que HubSpot attribue **dans chaque environnement** (ils sont différents entre le sandbox et la production).

## Questions fréquentes

**Pourquoi faut-il appliquer deux fois (sandbox et production) ?** Pour valider la modification dans un environnement sûr avant de toucher la production. De plus, HubSpot attribue des identifiants différents par portail, chaque environnement est donc géré séparément.

**J'obtiens une erreur lors de la mise à jour ou de l'archivage dans un environnement.** Assurez-vous que l'objet existe déjà dans cet environnement (il doit y avoir été créé d'abord). Sinon, créez-le avant d'appliquer d'autres modifications.

**L'environnement actif a-t-il de l'importance ?** La synchronisation lit depuis l'environnement actif de HubSpot. Changez l'environnement actif depuis le connecteur si vous souhaitez réconcilier avec l'autre portail.
