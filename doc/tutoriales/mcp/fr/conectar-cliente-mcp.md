# Connecter un client MCP (Claude Desktop) à l'application

**Prérequis :** avoir un projet créé et ouvert dans l'application.
**Temps estimé :** 3 minutes.

## Étapes

1. Ouvrez votre projet dans l'application.
2. Dans le menu latéral, cliquez sur **Configuration**.
3. Dans la section des connecteurs, cliquez sur **API / MCP**.
4. Activez l'interrupteur **Serveur MCP**. L'état passera à **Serveur MCP actif** et le **Port** sera affiché (par défaut, 3741).
5. Cliquez sur **Copier la configuration** pour copier le snippet prêt pour votre client MCP.
6. Collez le snippet dans le fichier de configuration de votre client (par exemple, le `claude_desktop_config.json` de Claude Desktop) et redémarrez-le.

> **Pourquoi `mcp-remote` :** Claude Desktop n'accepte que les serveurs **stdio** dans son fichier de configuration (il n'accepte pas `url`/`headers`). Le snippet utilise `npx mcp-remote` comme pont local vers le serveur SSE de l'application, avec le jeton dans `env`. Il requiert d'avoir **Node.js/npx** installé. Alternative sans fichier : ajouter le serveur distant depuis **Settings > Connectors** de Claude Desktop avec l'URL `http://127.0.0.1:3741/sse` et l'en-tête `x-api-key`.

## Résultat attendu

- Le client MCP se connecte au serveur local et liste les **tools disponibles**.
- Sur l'écran **API / MCP**, vous verrez la liste des tools que le client peut utiliser (au démarrage, au moins `mcp_health`, qui confirme la connexion et le projet actif).

## Le jeton d'accès

Le serveur exige un **jeton d'accès** qui voyage dans l'en-tête `x-api-key`. Le snippet l'inclut déjà. Vous pouvez l'afficher ou le masquer avec l'icône de l'œil, le copier, ou cliquer sur **Régénérer** pour en créer un nouveau.

> Lors de la régénération du jeton, le précédent cesse de fonctionner immédiatement. Vous devrez recopier la configuration dans votre client.

## Questions fréquentes

**Le serveur est-il exposé sur mon réseau ?** Non. Il écoute uniquement sur `127.0.0.1` (votre propre machine) ; il n'est pas accessible depuis d'autres appareils.

**Quel projet les tools voient-ils ?** Le projet actif dans l'application. Les tools n'accèdent pas à d'autres projets.

**Dois-je laisser l'application ouverte ?** Oui. Le serveur MCP s'exécute au sein de l'application ; si vous la fermez, le client perdra la connexion. Si vous laissez le serveur activé, il redémarre tout seul la prochaine fois que vous ouvrez l'application.

**Comment l'éteindre ?** Désactivez l'interrupteur **Serveur MCP** sur le même écran.
