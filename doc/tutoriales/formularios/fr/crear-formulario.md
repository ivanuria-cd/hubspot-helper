# Créer un nouveau formulaire (champs uniquement)

**Prérequis :** au moins une source et ses entrées de propriétés définies dans **CRM → Propriétés**.
**Temps estimé :** 4 minutes

L'assistant crée un formulaire HubSpot en définissant uniquement ses champs à partir d'une source. Il ne modifie pas les styles, les étapes, la logique conditionnelle ni le consentement légal (cela se gère dans HubSpot).

## Étapes

1. Accédez à **CRM → Formulaires** et cliquez sur **Formulaire**.
2. Saisissez le **nom** du formulaire.
3. Choisissez l'**objet** de HubSpot (standard ou personnalisé existant).
4. Cochez une ou plusieurs **sources**. L'application présélectionne les champs que ces sources définissent pour l'objet.
5. Ajustez la liste des champs : cochez ou décochez chacun et modifiez son libellé ainsi que les indicateurs **obligatoire**/**masqué**.
6. Cliquez sur **Créer**. Une **modification en attente** de type « créer un formulaire » est générée (rien n'est encore écrit dans HubSpot).
7. Appliquez la modification depuis **Modifications en attente** (voir « Synchroniser les modifications avec HubSpot »).

## Résultat attendu

Une modification en attente « Créer le formulaire «…» » apparaît. Une fois appliquée, le formulaire est créé dans HubSpot avec le type `hubspot` et est automatiquement associé aux sources choisies.

## Questions fréquentes

**Pourquoi seulement les champs ?** Le périmètre de l'application est la structure des champs et leur relation avec les sources ; la conception et la logique du formulaire restent dans HubSpot.

**Quel type de champ est utilisé ?** Celui qui correspond au type de la propriété de source (par exemple, une liste déroulante pour une propriété à options) ; la propriété `email` de contact utilise le champ d'e-mail.
