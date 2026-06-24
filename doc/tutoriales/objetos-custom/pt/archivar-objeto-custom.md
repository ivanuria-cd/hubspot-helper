# Arquivar um objeto custom

**Pré-requisitos:** ter um objeto custom criado no HubSpot.
**Tempo estimado:** 3 minutos

Arquivar elimina a definição do objeto no HubSpot. É uma ação destrutiva, por isso requer dupla confirmação.

## Passos

1. Abra **CRM → Objetos custom** e clique no objeto.
2. No painel de detalhe, prima **Arquivar**. O botão pedirá uma segunda confirmação («Confirmar arquivo»).
3. Confirme. Gera-se uma alteração pendente do tipo «arquivar».
4. Aplique a alteração no ambiente correspondente (sandbox ou produção).

## Resultado esperado

O objeto passa ao estado **arquivado** uma vez aplicado. Se o HubSpot rejeitar a operação, verá a mensagem de erro real (normalmente porque o objeto ainda tem registos, associações ou propriedades).

## Perguntas frequentes

**O HubSpot dá-me erro ao arquivar.** O HubSpot só permite arquivar um objeto quando todos os seus registos, associações e propriedades tiverem sido eliminados antes. Elimine-os no HubSpot e volte a aplicar.

**Diferença entre arquivar e apagar definitivamente (hard delete)?** Arquivar retira o objeto mas conserva o seu nome reservado. A eliminação definitiva (que liberta o nome para reutilização) **não está disponível** a partir da aplicação nesta versão; faça-o a partir do HubSpot se for necessário.

**Posso recuperar um objeto arquivado?** A recuperação é gerida a partir do HubSpot segundo as suas políticas; a aplicação não a realiza.
