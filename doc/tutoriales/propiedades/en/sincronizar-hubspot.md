# Sync the map with HubSpot

**Prerequisites:** the HubSpot connector configured in the project.
**Estimated time:** 3 minutes

Syncing compares the project's property definitions with the actual state of the HubSpot portal and classifies each property by its status.

## Steps

1. Go to **CRM → Properties**.
2. Check the app's top bar to see which HubSpot environment is active (production or sandbox).
3. Click **Sync HubSpot**. The app reads the portal's properties via HubSpot's properties API.
4. When it finishes you'll see a summary: how many properties are up to date, how many divergent and how many missing.

## Understanding the statuses

- **exists** (lime green badge): the property exists in HubSpot and matches the project definition.
- **divergent** (grey badge): it exists but differs (for example, a different label or options). Generates pending changes.
- **missing** (dark grey badge): it doesn't exist in HubSpot. Generates a creation pending change.

## Expected result

The table shows each property with its status badge. Portal properties that weren't yet in the map are imported as `exists`. The updated map is exported to the project's Google Sheets.

## FAQ

**Does syncing modify HubSpot?** No. It only reads. Any change in the portal is proposed as a pending change and requires your confirmation.

**Which objects does it sync?** The objects present in the map; if it's empty, contacts, deals and companies by default.
