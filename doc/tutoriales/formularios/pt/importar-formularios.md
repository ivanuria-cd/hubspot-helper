# Importar os formulários existentes

**Pré-requisitos:** conetor do HubSpot configurado no projeto (com o scope `forms`).
**Tempo estimado:** 3 minutos

A importação traz para a aplicação todos os formulários do portal — tanto os da ferramenta nova como os capturados da ferramenta legacy — para que possam ser associados a origens e a sua cobertura revista.

## Passos

1. Entre em **CRM → Formulários**.
2. Verifique na barra superior que ambiente do HubSpot está ativo (produção ou sandbox).
3. Prima **Sincronizar HubSpot**. A aplicação lê os formulários através da Marketing Forms API v3 (e, como apoio, a API legacy v2 apenas de leitura para formulários muito antigos).
4. Ao terminar, verá um resumo com quantos formulários foram importados e quantos foram atualizados.

## Compreender os tipos de formulário

- **hubspot**: formulário do HubSpot (editor novo ou legacy). É o único tipo que a aplicação pode criar.
- **captured**: formulário HTML externo capturado pela ferramenta de formulários não-HubSpot (a captura «legacy»).
- **flow**: formulário emergente (pop-up).
- **blog_comment**: formulário de comentários de blogue.

## Resultado esperado

A tabela mostra cada formulário com o seu tipo e o seu estado de cobertura. Pode pesquisar por nome e filtrar por tipo ou cobertura.

## Perguntas frequentes

**A importação modifica o HubSpot?** Não. Apenas lê. O estado de verdade dos formulários continua a ser o HubSpot.

**Porque não aparece um formulário?** Se for muito antigo, pode estar apenas na ferramenta legacy; a sincronização tenta importá-lo na mesma como apenas de leitura.
