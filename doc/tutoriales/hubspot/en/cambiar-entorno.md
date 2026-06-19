# Set up and switch between Production and Sandbox

**Prerequisites:** having the HubSpot connector configured in at least one environment (see *Connect the app to HubSpot*).
**Estimated time:** 3 minutes.

Each project supports two independent HubSpot environments: **Production** and **Sandbox**, each with its own token and portal. The active environment is the target of all write operations.

## Steps

### Configure the sandbox environment

1. Open your project → **Settings → Connectors → HubSpot**.
2. Select the **Sandbox** tab.
3. Paste your sandbox portal token and click **Save**.

### Switch the active environment

1. On the same screen, select the tab for the environment you want to activate.
2. If it is connected and not the active one, click **Use as active environment**.

The active environment is shown permanently as a badge in the top bar (**PROD** or **SANDBOX**), visible from any screen.

## Expected result

- The top bar badge reflects the active environment.
- Read operations can run against any configured environment.
- Write operations always use the active environment and show a confirmation indicating the target.

## FAQ

**What is the sandbox for?** For testing automations and changes without touching real data. Configure in sandbox first, validate, then replicate in production.

**Can I have production only?** Yes. The sandbox environment is optional; if you don't configure it, the app works with production only.

**I switched environments by mistake.** Return to the connector screen, select the correct environment and click **Use as active environment**. The change is immediate.
