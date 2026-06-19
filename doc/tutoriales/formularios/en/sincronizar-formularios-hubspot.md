# Sync changes with HubSpot

**Prerequisites:** at least one pending form change (created when you create a form or add missing fields).
**Estimated time:** 3 minutes

No change is written to HubSpot automatically. Changes pile up as pending and you apply them yourself, being able to test first in sandbox and then in production.

## Steps

1. Go to **CRM → Forms**.
2. Click **Pending changes (N)**.
3. Review each change: its summary, the operation type and its status per environment.
4. Check the top bar to see which environment is active.
5. Click **Apply in Sandbox** to test the change without touching production.
6. When you're satisfied, click **Apply in Production**.
7. If a change is no longer needed, click **Discard**.

## Understanding the statuses

- **sandbox ✓ / ✕**: whether the change has been applied in sandbox.
- **production ✓ / ✕**: whether the change has been applied in production.

A change is not considered complete until it is applied in production.

## Expected result

After applying, the form is created or updated in HubSpot in the chosen environment and the change is marked for that environment.

## FAQ

**What happens if the `forms` scope is missing?** HubSpot returns a permissions error (403) and the app shows it to you; the change is not marked as applied.

**Can I apply directly to production?** Yes, but validating in sandbox first is recommended.

**Can forms be deleted from the app?** No. Deleting forms is out of scope.
