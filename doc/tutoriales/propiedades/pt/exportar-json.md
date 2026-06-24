# Exportar JSON por origem

**Pré-requisitos:** ter pelo menos uma origem com propriedades mapeadas.
**Tempo estimado:** 2 minutos

A exportação gera um ficheiro JSON com as propriedades associadas a uma origem, incluindo o campo de origem e as regras de transformação. É um contrato de integração pensado para que a equipa de desenvolvimento saiba exatamente o que enviar ao HubSpot e como transformar cada valor.

## Passos

1. Entre em **CRM → Propriedades**.
2. Prima **Exportar JSON**. Abre-se um menu com um elemento por cada origem do projeto.
3. Selecione a origem que pretende exportar.
4. O navegador descarrega um ficheiro com o nome `{nome-origem}_{data}.json`.

## O que contém o ficheiro

- `schema_version`: versão do contrato (atualmente 1).
- `origin`: identificador, nome e tipo da origem.
- `exported_at`: data e hora da exportação.
- `properties`: para cada propriedade mapeada a essa origem, o seu nome técnico, etiqueta, objeto, tipo, campo de origem e as transformações (valor de origem → valor HubSpot).

## Resultado esperado

Um ficheiro JSON descarregado, pronto para partilhar com a equipa de desenvolvimento ou anexar à documentação da integração.

## Perguntas frequentes

**O JSON fica guardado no Google Drive?** Não. A exportação é gerada a pedido e descarregada localmente; não é armazenada automaticamente no Drive.

**Porque exportar por origem e não tudo junto?** Cada origem costuma corresponder a uma integração distinta; o contrato por origem é exatamente o que necessita quem desenvolve essa integração.
