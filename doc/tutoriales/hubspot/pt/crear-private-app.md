# Criar uma Private App no HubSpot e obter o token

**Pré-requisitos:** ser administrador (Super Admin) do portal do HubSpot.
**Tempo estimado:** 5 minutos.

A aplicação liga-se ao HubSpot através de um *Private App Token* (PAT). É o método recomendado pelo HubSpot para integrações internas e substitui as antigas API Keys.

## Passos

1. Inicie sessão no HubSpot com uma conta de administrador.
2. Vá a **Definições** (o ícone da roda dentada, no canto superior direito).
3. No menu lateral, abra **Integrações → Aplicações privadas**.
4. Prima **Criar uma aplicação privada**.
5. No separador **Informação básica**, escreva um nome (por exemplo, `RevOps Assistant`) e uma descrição.
6. Abra o separador **Âmbitos (scopes)** e ative, no mínimo:
   - `crm.objects.contacts.read` — verificação básica de conetividade.

   Acrescente ainda os scopes que as características que vai usar exijam (cada característica documenta os seus; por exemplo, automação requer `automation`).

   Em concreto, o **consentimento legal de formulários** (tipos de subscrição) requer o scope **`communication_preferences.read`** (Subscription Preferences API), disponível em qualquer conta. Sem ele, listar os tipos de subscrição devolve um erro de permissões (403).

   > **Importante:** anote que scopes ativa. A aplicação **não pode ler nem mostrar os scopes** de uma chave privada (o HubSpot não os expõe via API), pelo que a lista de permissões só é visível aqui, no HubSpot.
7. Prima **Criar aplicação** e confirme no aviso.
8. O HubSpot mostrará o **token de acesso**. Prima **Mostrar token** e depois **Copiar**.

## Resultado esperado

Tem na área de transferência um token que começa por `pat-` (por exemplo, `pat-eu1-xxxxxxxx`). Guarde-o num local seguro de forma temporária; irá introduzi-lo na aplicação no tutorial seguinte.

## Perguntas frequentes

**Posso mudar os scopes mais tarde?** Sim. Volte à aplicação privada, ajuste os âmbitos e guarde; o HubSpot gera a atualização sem mudar o token.

**Onde fica guardado o token na aplicação?** Cifrado no porta-chaves (keychain) do seu sistema operativo. Nunca é mostrado no ecrã nem escrito nos registos.

**Tenho uma conta sandbox.** Repita estes passos dentro do portal sandbox para obter um token independente; irá usá-lo no ambiente *Sandbox* da aplicação.
