# Scopes do HubSpot por característica

**Pré-requisitos:** ser administrador (Super Admin) do portal do HubSpot.
**Tempo estimado:** 10 minutos.

Este tutorial explica como criar o *Private App Token* (PAT) com o qual a aplicação se liga ao HubSpot e que *scopes* (âmbitos de permissão) ativar consoante as características que vai usar. Para o detalhe passo a passo da criação, consulte também «Criar uma Private App no HubSpot e obter o token».

> **Nota importante:** os scopes de um Private App Token **não podem ser consultados via API**. A aplicação não deteta nem valida as permissões de forma antecipada. Se ativar a menos, o HubSpot devolve um erro `403` na operação concreta a indicar o scope em falta. Por isso convém ativar de uma só vez o conjunto agrupado do final.

## Criar a chave PAT

1. Inicie sessão no HubSpot com uma conta de administrador.
2. Vá a **Definições** (ícone da roda dentada, no canto superior direito).
3. No menu lateral, abra **Integrações → Aplicações privadas**.
4. Prima **Criar uma aplicação privada**.
5. Em **Informação básica**, escreva um nome (por exemplo, `RevOps Assistant`) e uma descrição.
6. Abra o separador **Âmbitos (scopes)** e ative os que necessitar (ver tabelas seguintes).
7. Prima **Criar aplicação** e confirme.
8. Prima **Mostrar token** e **Copiar**. O token começa por `pat-` (por exemplo, `pat-eu1-xxxxxxxx`).

Ligações oficiais do HubSpot:

- Criar aplicações privadas: https://knowledge.hubspot.com/integrations/create-private-apps
- Referência de scopes: https://developers.hubspot.com/docs/guides/apps/authentication/scopes
- Aplicações privadas (guia para programadores): https://developers.hubspot.com/docs/guides/apps/private-apps/overview

## Scopes por característica

### Ligação básica (sempre)

| Scope | Motivo |
|-------|--------|
| `crm.objects.contacts.read` | Verificação de conetividade do conetor base |

### Gestão de propriedades

| Scope | Motivo |
|-------|--------|
| `crm.schemas.contacts.read` | Ler propriedades de contactos |
| `crm.schemas.contacts.write` | Criar/editar propriedades de contactos |
| `crm.schemas.deals.read` | Ler propriedades de deals |
| `crm.schemas.deals.write` | Criar/editar propriedades de deals |
| `crm.schemas.companies.read` | Ler propriedades de companies |
| `crm.schemas.companies.write` | Criar/editar propriedades de companies |

### Objetos custom

| Scope | Motivo |
|-------|--------|
| `crm.schemas.custom.read` | Ler definições de objetos custom (CRM Schemas API) |
| `crm.schemas.custom.write` | Criar/editar/arquivar definições de objetos custom |

### Gestão de formulários

| Scope | Motivo |
|-------|--------|
| `forms` | Ler, criar e atualizar formulários (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Resolver propriedades e objetos de destino para a cobertura (partilhado com Propriedades) |
| `communication_preferences.read` | Listar os tipos de subscrição para o consentimento legal (Subscription Preferences API). Sem ele, o HubSpot devolve `403` |

### Dashboard de estado e Vista geral do CRM

Não requerem scopes novos: reutilizam os já concedidos pelas características anteriores.

## Conjunto agrupado (todos os casos)

Para habilitar toda a aplicação de uma só vez, ative estes onze scopes:

| Scope | Usado por |
|-------|-----------|
| `crm.objects.contacts.read` | Ligação básica |
| `crm.schemas.contacts.read` | Propriedades, Formulários |
| `crm.schemas.contacts.write` | Propriedades |
| `crm.schemas.deals.read` | Propriedades |
| `crm.schemas.deals.write` | Propriedades |
| `crm.schemas.companies.read` | Propriedades |
| `crm.schemas.companies.write` | Propriedades |
| `crm.schemas.custom.read` | Objetos custom |
| `crm.schemas.custom.write` | Objetos custom |
| `forms` | Formulários |
| `communication_preferences.read` | Formulários (consentimento legal) |

## Resultado esperado

Tem uma Private App com os scopes das características que vai usar e um token `pat-…` copiado, pronto para introduzir na aplicação (ver «Ligar o HubSpot»).

## Perguntas frequentes

**Posso mudar os scopes mais tarde?** Sim. Volte à aplicação privada, ajuste os âmbitos e guarde; o token não muda.

**Porque é que a aplicação não me avisa de que falta um scope antes de operar?** Porque o HubSpot não expõe os scopes de um PAT via API. A falha só surge (como `403`) ao executar a operação que o necessita.

**E se eu só for usar uma característica?** Ative a secção «Ligação básica» mais a secção dessa característica. Pode acrescentar o resto depois sem regenerar o token.
