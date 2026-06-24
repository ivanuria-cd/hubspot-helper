# Configurer et basculer entre Production et Sandbox

**Prérequis :** avoir le connecteur HubSpot configuré dans au moins un environnement (voir *Connecter l'application à HubSpot*).
**Temps estimé :** 3 minutes.

Chaque projet prend en charge deux environnements HubSpot indépendants : **Production** et **Sandbox**, chacun avec son propre jeton et son propre portail. L'environnement actif est la destination de toutes les opérations d'écriture.

## Étapes

### Configurer l'environnement sandbox

1. Ouvrez votre projet → **Configuration → Connecteurs → HubSpot**.
2. Sélectionnez l'onglet **Sandbox**.
3. Collez le jeton de votre portail sandbox et cliquez sur **Enregistrer**.

### Changer l'environnement actif

1. Sur le même écran, sélectionnez l'onglet de l'environnement que vous souhaitez activer.
2. S'il est connecté et qu'il n'est pas l'actif, cliquez sur **Utiliser comme environnement actif**.

L'environnement actif s'affiche en permanence sous forme d'étiquette dans la barre supérieure (**PROD** ou **SANDBOX**), visible depuis n'importe quel écran.

## Résultat attendu

- L'étiquette de la barre supérieure reflète l'environnement actif.
- Les opérations de lecture peuvent s'exécuter sur n'importe quel environnement configuré.
- Les opérations d'écriture utilisent toujours l'environnement actif et affichent une confirmation indiquant la destination.

## Questions fréquentes

**À quoi sert le sandbox ?** À tester des automatisations et des modifications sans toucher aux données réelles. Configurez d'abord dans le sandbox, validez, puis répliquez en production.

**Puis-je n'avoir que la production ?** Oui. L'environnement sandbox est facultatif ; si vous ne le configurez pas, l'application travaille uniquement avec la production.

**J'ai changé d'environnement par erreur.** Revenez à l'écran du connecteur, sélectionnez l'environnement correct et cliquez sur **Utiliser comme environnement actif**. Le changement est immédiat.
