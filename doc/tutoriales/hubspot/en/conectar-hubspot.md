# Connect the app to HubSpot

**Prerequisites:** having a private app token (see *Create a Private App in HubSpot and get the token*) and a project created in the app.
**Estimated time:** 2 minutes.

## Steps

1. Open your project in the app.
2. In the side menu, click **Settings**.
3. In the **Connectors** section, click **HubSpot**.
4. Make sure you have the tab selected for the environment you want to configure: **Production** or **Sandbox**.
5. Paste the token into the **Private App Token** field.
6. Click **Save**.

The app verifies the token against HubSpot and, if it is valid, shows the connection status.

## Expected result

- A **Connected** indicator (lime green badge).
- The line **Portal: _name_ (_id_)** with your HubSpot account details.
- The **API version** in use.

If the token is not valid, you'll see an error message explaining why and the connection will not be saved.

> **About permissions (scopes):** the app does not show the token's scopes. HubSpot's private app tokens do not allow querying their scopes via API, so the app cannot list them. Review and adjust the scopes directly in HubSpot, inside the private app (see *Create a Private App in HubSpot and get the token*). If a feature is missing a permission, you'll notice it when using the feature, not on this screen.

## FAQ

**Is my token visible anywhere?** No. The field is a password field, the token is stored encrypted in the system keychain and is hidden (`[REDACTED]`) in any log.

**How do I disconnect the portal?** On the same screen, with the environment selected, click **Revoke**. The token for that environment is removed.

**What happens if the token expires or I change it?** Paste the new token again and click **Save**; the app re-validates and updates the portal details.
