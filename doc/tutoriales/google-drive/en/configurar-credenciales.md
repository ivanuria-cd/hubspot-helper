# Configure your Google credentials

**What it's for:** telling the app the **OAuth client ID** (and, if your client requires it, the **secret**) used to connect to Google Drive. This used to live only in the `.env` file; now you can do it from within the app itself.
**Estimated time:** 2 minutes.

## What you need from Google Cloud

Only the **OAuth client ID** from your Google Cloud project (a value that ends in `.apps.googleusercontent.com`). No API key is required: the app's folder picker does not use the Google Picker.

> If your OAuth client is of type "Desktop app" and requires a secret, have the **client secret** ready too. For PKCE clients it is usually not necessary.

## Steps

1. Go to **Settings > Connectors > Google Drive**.
2. In the **Google Cloud credentials** card, paste your **Client ID** into the corresponding field.
3. (Optional) Enter the **client secret** if your client requires it.
4. Click **Save**. The change takes effect instantly: no restart needed.

## Where each credential comes from

Each field shows a label with its source:

- **App** — the value is stored in the application (the ID in local settings; the secret in the operating system keychain).
- **.env** — there is no value in the app and the one from the `.env` file is being used as a fallback.

The value configured in the app takes precedence over the `.env`.

## Clearing credentials

Click **Clear** to remove the ID and secret from the app. If a value exists in `.env`, the app will automatically use it again.

## FAQ

**Where is the secret stored?**
In the operating system keychain (the same place where access tokens are stored), never in plain text. The app only shows whether it is configured, without revealing its value.

**Why is an API key no longer requested?**
Folder selection uses the app's own picker, which browses your Drive with OAuth only. The Google Picker, which did require an API key, has been removed.

**I changed the client ID and the account is still connected.**
The existing connection stays until you disconnect. If you switch Google Cloud projects, disconnect and reconnect to authorize with the new credentials.
