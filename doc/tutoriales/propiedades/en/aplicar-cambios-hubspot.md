# Apply changes in HubSpot

**Prerequisites:** having synced the map and having pending changes. To validate in sandbox, having that environment configured in the HubSpot connector.
**Estimated time:** 5 minutes

The app never writes to HubSpot automatically. The required changes (creating properties, adjusting labels, options or types) are presented as a list that you review and apply explicitly. The recommendation is to apply first in **sandbox**, validate, and only then in **production**.

## Steps

1. Go to **CRM → Properties**.
2. Click **Pending changes (n)** to open the changes view. Each card shows the property, the operation and the corresponding API call.
3. For each change:
   - Click **Apply in Sandbox** to run it in the test environment. When it completes successfully, the status changes to `sandbox ✓`.
   - Validate in your HubSpot sandbox that the result is as expected.
   - Click **Apply in Production** to run it in the real portal. The status changes to `production ✓`.
4. If a change does not apply, click **Discard** to remove it from the list.

## Expected result

Each change reflects its status per environment (sandbox and production). A change is not considered complete until it has been applied in production.

## FAQ

**Can I apply directly in production without going through sandbox?** Yes, but it's not recommended. Validating in sandbox reduces the risk of errors in the real portal.

**What happens if the HubSpot call fails?** The change is not marked as applied and you'll see the error message. Fix the cause and try again.

**This is a sensitive topic:** applying changes in production modifies a client's real portal. Make sure of the active environment before confirming.
