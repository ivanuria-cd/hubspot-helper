# Rever a cobertura de um formulário

**Pré-requisitos:** um formulário associado a uma ou várias origens (ver «Associar um formulário a uma origem»).
**Tempo estimado:** 2 minutos

A cobertura indica se um formulário contém todos os campos que a sua origem exige para um objeto. Serve para detetar formulários incompletos antes de os publicar.

## Passos

1. Entre em **CRM → Formulários**.
2. Observe o badge de cobertura de cada formulário na tabela.
3. Clique num formulário para abrir o seu painel e ver o detalhe por origem: quantas propriedades são esperadas, quantas estão presentes e quais faltam.

## Compreender os estados

- **completo** (badge lima): todos os campos que a(s) origem(ns) define(m) estão presentes no formulário.
- **faltam N** (badge com aviso): faltam N campos definidos pela origem.
- **sem origem** (badge cinzento): o formulário não está associado a nenhuma origem, pelo que não pode ser avaliado.

## Resultado esperado

No painel, cada propriedade esperada aparece assinalada como presente ou como ausente. Se faltarem campos, verá o botão **Adicionar campos em falta**.

## Perguntas frequentes

**A cobertura é calculada por objeto?** Sim. A comparação é por objeto + nome técnico da propriedade; um campo de outro objeto não conta.

**A cobertura olha para os valores ou apenas para a presença do campo?** Apenas verifica que o campo (a propriedade de destino) exista no formulário.
