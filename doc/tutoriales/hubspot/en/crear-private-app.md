# Create a Private App in HubSpot and get the token

**Prerequisites:** being an administrator (Super Admin) of the HubSpot portal.
**Estimated time:** 5 minutes.

The application connects to HubSpot using a *Private App Token* (PAT). It is HubSpot's recommended method for internal integrations and replaces the old API Keys.

## Steps

1. Sign in to HubSpot with an administrator account.
2. Go to **Settings** (the gear icon, top right).
3. In the side menu, open **Integrations → Private Apps**.
4. Click **Create a private app**.
5. On the **Basic Info** tab, enter a name (for example, `RevOps Assistant`) and a description.
6. Open the **Scopes** tab and enable, at a minimum:
   - `crm.objects.contacts.read` — basic connectivity check.

   Also add the scopes required by the features you intend to use (each feature documents its own; for example, automation requires `automation`).

   In particular, the **legal consent of forms** (subscription types) requires the **`communication_preferences.read`** scope (Subscription Preferences API), available on any account. Without it, listing the subscription types returns a permissions error (403).

   > **Important:** note down which scopes you enable. The app **cannot read or display the scopes** of a private app token (HubSpot does not expose them via API), so the list of permissions is only visible here, in HubSpot.
7. Click **Create app** and confirm in the prompt.
8. HubSpot will display the **access token**. Click **Show token** and then **Copy**.

## Expected result

You have a token in your clipboard that starts with `pat-` (for example, `pat-eu1-xxxxxxxx`). Save it temporarily in a safe place; you'll enter it in the app in the next tutorial.

## FAQ

**Can I change the scopes later?** Yes. Return to the private app, adjust the scopes and save; HubSpot applies the update without changing the token.

**Where is the token stored in the app?** Encrypted in your operating system keychain. It is never shown on screen or written to the logs.

**I have a sandbox account.** Repeat these steps inside the sandbox portal to obtain a separate token; you'll use it in the app's *Sandbox* environment.
