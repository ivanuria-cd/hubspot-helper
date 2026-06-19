# Apply object changes in HubSpot

**Prerequisites:** having custom objects with pending changes (creation, edit or archive).
**Estimated time:** 3–5 minutes

The app never writes to HubSpot automatically. Changes pile up as **pending** and you apply them yourself, first in **sandbox** to validate and then in **production**.

## Steps

1. Open **CRM → Custom objects**.
2. Click **Pending changes** (it shows the number in parentheses) or open a specific object's panel.
3. For each change you'll see the operation (create / update schema / archive) and its status per environment.
4. Click **Apply to Sandbox**. Check in your sandbox portal that the object turned out as expected.
5. When you're satisfied, click **Apply to Production**.
6. If a change is no longer needed, click **Discard**.

## Expected result

- After applying in sandbox, the change status shows "sandbox ✓".
- After applying in production, it shows "production ✓".
- On creation, the app stores the identifier HubSpot assigns **in each environment** (they differ between sandbox and production).

## FAQ

**Why do I have to apply twice (sandbox and production)?** To validate the change in a safe environment before touching production. Also, HubSpot assigns different identifiers per portal, so each environment is managed separately.

**I get an error when updating or archiving in an environment.** Make sure the object already exists in that environment (it must have been created there first). If not, create it before applying other changes.

**Does the active environment matter?** The sync reads from the active HubSpot environment. Change the active environment from the connector if you want to reconcile against the other portal.
