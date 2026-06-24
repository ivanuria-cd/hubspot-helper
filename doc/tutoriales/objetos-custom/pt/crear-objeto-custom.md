# Criar um objeto custom

**Pré-requisitos:** ter configurado o conetor do HubSpot (pelo menos um ambiente) e ter aberto um projeto.
**Tempo estimado:** 5–10 minutos

Os objetos custom permitem-lhe representar no HubSpot entidades próprias do seu negócio (máquinas, contratos, veículos…) que não encaixam nos objetos padrão. Este ecrã cria a **definição** do objeto; os registos (instâncias) são geridos depois no HubSpot.

## Passos

1. No menu lateral, dentro de **CRM**, abra **Objetos custom**.
2. Prima **Objeto custom** para abrir o assistente de criação.
3. **Identidade**:
   - **Nome interno**: identificador técnico (apenas minúsculas, números e sublinhados; começa por letra). **Não poderá mudá-lo depois.**
   - **Etiqueta singular** e **Etiqueta plural**: como o objeto se chamará na interface (p. ex. «Máquina» / «Máquinas»).
   - **Descrição** (opcional): para que serve o objeto.
4. **Propriedades iniciais**: adicione as propriedades que o objeto terá. Por cada uma indique **Nome interno** (identificador técnico), **Etiqueta**, **Tipo** e **Tipo de campo**. O **Tipo de campo** é uma lista pendente que se ajusta automaticamente ao tipo escolhido (não tem de adivinhar o valor). Marque **Único** se essa propriedade identificar de forma unívoca cada registo. Use **Adicionar propriedade** para somar mais.
5. **Visualização** (as listas pendentes mostram a **etiqueta** de cada propriedade):
   - **Propriedade principal**: a propriedade que dá nome a cada registo (obrigatória).
   - **Obrigatórias**, **Secundárias** e **Pesquisa**: selecione, entre as propriedades definidas, quais são obrigatórias, quais se mostram sob o nome e quais se indexam para pesquisar.
6. **Associações** (opcional): escolha com que objetos (contactos, empresas, outros custom) poderá relacionar-se.
7. Prima **Guardar**. O objeto é adicionado como **rascunho** com uma alteração pendente do tipo «criar».

## Resultado esperado

O objeto aparece na lista com estado **rascunho** (✕). Ainda não existe no HubSpot: para o criar, vá às suas alterações pendentes e aplique-o primeiro em sandbox e depois em produção (ver «Aplicar alterações de objetos no HubSpot»).

## Perguntas frequentes

**Porque é que não posso mudar o nome interno depois?** É uma restrição do HubSpot: o nome é imutável uma vez criado o objeto. As etiquetas, essas, podem ser mudadas.

**Tenho de criar todas as propriedades aqui?** Não. Pode criar o objeto com as mínimas e adicionar mais propriedades depois a partir do ecrã de **Propriedades**.
