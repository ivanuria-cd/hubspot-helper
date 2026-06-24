# Sélectionner le dossier de travail

**Prérequis :** avoir connecté le compte Google (voir « Connecter Google Drive »).
**Temps estimé :** 1 minute.

## Étapes

1. Dans **Configuration > Connecteurs > Google Drive**, repérez la section **Dossier de travail**.
2. Cliquez sur **Sélectionner un dossier** (ou **Changer de dossier** s'il y en avait déjà un).
3. Le sélecteur de dossiers de l'application s'ouvre. Il commence par **Mon Drive** ; cliquez sur un dossier pour y entrer et utilisez le chemin supérieur (fil d'Ariane) pour revenir en arrière.
4. Une fois à l'intérieur du dossier que vous souhaitez utiliser, cliquez sur **Sélectionner ce dossier**.
5. L'application affichera le nom du dossier choisi à côté de l'icône de dossier.

## Résultat attendu

La section **Dossier de travail** affiche le nom du dossier sélectionné et la section **Synchronisation** est activée.

## Questions fréquentes

**Puis-je changer de dossier plus tard ?**
Oui. Revenez à cet écran et cliquez sur **Changer de dossier**. Notez que les fichiers gérés vivent à l'intérieur du dossier choisi.

**L'application verra-t-elle les autres fichiers déjà présents dans ce dossier ?**
Elle ne gérera que les fichiers qu'elle crée elle-même (marqués en interne comme gérés). Le reste du contenu du dossier n'est pas touché.

**Une clé API Google est-elle nécessaire ?**
Non. Le sélecteur appartient à l'application et navigue dans votre Drive uniquement avec la permission OAuth. Pour pouvoir lister les dossiers, l'application demande la permission de lecture des métadonnées de Drive ; c'est pourquoi, à la connexion, vous reverrez l'écran de consentement de Google.

**Je ne vois pas mes Drive partagés (Shared Drives).**
Cette version du sélecteur ne navigue que dans « Mon Drive ». La prise en charge des Drive partagés reste une évolution future.
