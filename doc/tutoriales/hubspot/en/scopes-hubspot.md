# HubSpot scopes by feature

**Prerequisites:** being an administrator (Super Admin) of the HubSpot portal.
**Estimated time:** 10 minutes.

This tutorial explains how to create the *Private App Token* (PAT) the application uses to connect to HubSpot and which *scopes* (permission scopes) to enable depending on the features you'll use. For the step-by-step detail of the creation, see also "Create a Private App in HubSpot and get the token".

> **Important note:** the scopes of a Private App Token **cannot be queried via API**. The application does not detect or validate permissions in advance. If you enable too few, HubSpot returns a `403` error on the specific operation indicating the missing scope. That's why it's best to enable the grouped set at the end all at once.

## Create the PAT key

1. Sign in to HubSpot with an administrator account.
2. Go to **Settings** (gear icon, top right).
3. In the side menu, open **Integrations → Private apps**.
4. Click **Create a private app**.
5. In **Basic information**, type a name (for example, `RevOps Assistant`) and a description.
6. Open the **Scopes** tab and enable the ones you need (see the tables below).
7. Click **Create app** and confirm.
8. Click **Show token** and **Copy**. The token starts with `pat-` (for example, `pat-eu1-xxxxxxxx`).

Official HubSpot links:

- Create private apps: https://knowledge.hubspot.com/integrations/create-private-apps
- Scopes reference: https://developers.hubspot.com/docs/guides/apps/authentication/scopes
- Private apps (developer guide): https://developers.hubspot.com/docs/guides/apps/private-apps/overview

## Scopes by feature

### Basic connection (always)

| Scope | Reason |
|-------|--------|
| `crm.objects.contacts.read` | Connectivity check of the base connector |

### Property management

| Scope | Reason |
|-------|--------|
| `crm.schemas.contacts.read` | Read contact properties |
| `crm.schemas.contacts.write` | Create/edit contact properties |
| `crm.schemas.deals.read` | Read deal properties |
| `crm.schemas.deals.write` | Create/edit deal properties |
| `crm.schemas.companies.read` | Read company properties |
| `crm.schemas.companies.write` | Create/edit company properties |

### Custom objects

| Scope | Reason |
|-------|--------|
| `crm.schemas.custom.read` | Read custom object definitions (CRM Schemas API) |
| `crm.schemas.custom.write` | Create/edit/archive custom object definitions |

### Form management

| Scope | Reason |
|-------|--------|
| `forms` | Read, create and update forms (Marketing Forms API v3) |
| `crm.schemas.contacts.read` | Resolve target properties and objects for coverage (shared with Properties) |
| `communication_preferences.read` | List subscription types for legal consent (Subscription Preferences API). Without it, HubSpot returns `403` |

### Status Dashboard and CRM overview

They don't require new scopes: they reuse those already granted by the previous features.

## Grouped set (all cases)

To enable the whole application at once, enable these eleven scopes:

| Scope | Used by |
|-------|---------|
| `crm.objects.contacts.read` | Basic connection |
| `crm.schemas.contacts.read` | Properties, Forms |
| `crm.schemas.contacts.write` | Properties |
| `crm.schemas.deals.read` | Properties |
| `crm.schemas.deals.write` | Properties |
| `crm.schemas.companies.read` | Properties |
| `crm.schemas.companies.write` | Properties |
| `crm.schemas.custom.read` | Custom objects |
| `crm.schemas.custom.write` | Custom objects |
| `forms` | Forms |
| `communication_preferences.read` | Forms (legal consent) |

## Expected result

You have a Private App with the scopes for the features you'll use and a `pat-…` token copied, ready to enter into the app (see "Connect HubSpot").

## FAQ

**Can I change the scopes later?** Yes. Go back to the private app, adjust the scopes and save; the token doesn't change.

**Why doesn't the app warn me that a scope is missing before operating?** Because HubSpot does not expose a PAT's scopes via API. The failure only appears (as `403`) when you run the operation that needs it.

**What if I'm only going to use one feature?** Enable the "Basic connection" section plus that feature's section. You can add the rest later without regenerating the token.
