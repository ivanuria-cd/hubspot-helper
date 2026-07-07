# Créer et réimporter la carte de champs de planification

**Prérequis :** avoir un projet ouvert, le connecteur Google Drive configuré avec un dossier de travail et, pour la confrontation avec le portail, le connecteur HubSpot. Il est utile d'avoir défini les origines de données et leurs champs.
**Temps estimé :** 10 minutes

La carte de champs de planification est un document Google Sheets **modifiable** que l'application génère pour que le client décide, sur le document lui-même, comment chaque champ d'origine est mappé vers une propriété HubSpot. Contrairement au fichier d'état, ce document est conçu pour être rempli à la main : il comporte des menus déroulants, un onglet par objet et des feuilles de catalogue par origine. Lorsque le client le renvoie rempli, l'application le relit, vous montre un résumé des changements et crée des brouillons que vous révisez ensuite.

## Étapes

1. Allez dans **CRM → Propriétés**.
2. Cliquez sur **Générer la carte de planification**. L'application crée (ou met à jour) dans votre dossier Drive un Google Sheets avec :
   - une feuille **Légende** expliquant les colonnes et les états ;
   - un onglet par objet HubSpot, avec le bloc HubSpot (Custom, Name, Internal name, Type…) et un bloc par origine applicable (Field name, Origin, Comments) ;
   - une feuille **Origine …** par système source, avec la propriété de destination calculée ;
   - une feuille **Associations** (à titre indicatif seulement).
3. Partagez le document avec le client. Sur chaque onglet d'objet, il peut remplir, à l'aide des menus déroulants :
   - **Custom** : `No` (existe déjà), `Yes (Pending)` (à créer) ou `Yes (Created)` (déjà créée) ;
   - **Field name** : le champ d'origine qui alimente la propriété ;
   - **Origin** : `Migration` ou `Integration` ;
   - **Type** : le type du champ en langage simple (texte, nombre, monnaie, téléphone…).
4. Une fois le document rempli, revenez dans **CRM → Propriétés** et cliquez sur **Importer la planification**.
5. S'il y a des changements par rapport au projet, un **résumé des changements** s'ouvre (ajouts, suppressions, changements de mappage ou de type) et, le cas échéant, la liste des **champs nécessitant une action** : ce sont des types ambigus (par exemple « choix », qui peut être un menu déroulant, des cases ou des boutons) qu'il faut préciser. Rien n'est encore appliqué.
6. Vérifiez le résumé et cliquez sur **Créer des brouillons**. L'application crée ou met à jour les entrées de la carte. Les champs dont le type n'est pas résolu restent **bloqués** et ne sont pas créés tant que vous n'indiquez pas le type concret.
7. Les entrées restent en brouillon dans la carte. Vérifiez-les, synchronisez avec HubSpot et appliquez les changements avec le flux habituel (voir « Synchroniser avec HubSpot » et « Appliquer les changements dans HubSpot »).

## Résultat attendu

Le document de planification est généré dans Drive avec ses menus déroulants et, lors de la réimportation, l'application vous montre ce qui change avant de toucher à quoi que ce soit et crée les entrées en brouillon. À aucun moment des changements ne sont appliqués dans HubSpot : cela nécessite toujours de synchroniser et d'appliquer de façon explicite.

## Questions fréquentes

**L'importation applique-t-elle quelque chose dans HubSpot ?** Non. L'importation ne fait que créer ou mettre à jour des brouillons dans la carte du projet. Les changements dans HubSpot passent toujours par la synchronisation et l'application par environnement.

**Que signifie qu'un champ « nécessite une action » ?** Que le type choisi en langage simple correspond à plusieurs configurations HubSpot et qu'il faut préciser laquelle. Tant qu'il n'est pas résolu, ce champ n'est pas créé.

**Le document est-il protégé ?** Non. Il est modifiable à dessein, pour que le client le remplisse. Le fichier d'état du projet reste l'enregistrement fidèle et n'est pas touché.

**Puis-je le régénérer ?** Oui. Cliquer de nouveau sur « Générer la carte de planification » met à jour le document existant.
