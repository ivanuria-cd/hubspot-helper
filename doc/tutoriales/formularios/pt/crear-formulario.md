# Criar um formulário novo (apenas campos)

**Pré-requisitos:** pelo menos uma origem e as suas entradas de propriedades definidas em **CRM → Propriedades**.
**Tempo estimado:** 4 minutos

O assistente cria um formulário do HubSpot definindo unicamente os seus campos a partir de uma origem. Não edita estilos, passos, lógica condicional nem consentimento legal (isso é gerido no HubSpot).

## Passos

1. Entre em **CRM → Formulários** e prima **Formulário**.
2. Escreva o **nome** do formulário.
3. Escolha o **objeto** do HubSpot (padrão ou custom existente).
4. Selecione uma ou várias **origens**. A aplicação pré-seleciona os campos que essas origens definem para o objeto.
5. Ajuste a lista de campos: marque ou desmarque cada um e edite a sua etiqueta e os indicadores **obrigatório**/**oculto**.
6. Prima **Criar**. Gera-se uma **alteração pendente** do tipo «criar formulário» (ainda não é escrito no HubSpot).
7. Aplique a alteração a partir de **Alterações pendentes** (ver «Sincronizar as alterações com o HubSpot»).

## Resultado esperado

Surge uma alteração pendente «Criar formulário «…»». Ao aplicá-la, o formulário é criado no HubSpot com tipo `hubspot` e fica associado automaticamente às origens escolhidas.

## Perguntas frequentes

**Porquê apenas campos?** O âmbito da aplicação é a estrutura de campos e a sua relação com as origens; o design e a lógica do formulário mantêm-se no HubSpot.

**Que tipo de campo se usa?** O que corresponde ao tipo da propriedade de origem (por exemplo, lista pendente para uma propriedade de opções); a propriedade `email` de contacto usa o campo de email.
