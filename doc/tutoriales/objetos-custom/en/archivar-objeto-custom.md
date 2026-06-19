# Archive a custom object

**Prerequisites:** having a custom object created in HubSpot.
**Estimated time:** 3 minutes

Archiving removes the object's definition in HubSpot. It is a destructive action, which is why it requires double confirmation.

## Steps

1. Open **CRM → Custom objects** and click the object.
2. In the detail panel, click **Archive**. The button will ask for a second confirmation ("Confirm archive").
3. Confirm. An "archive" pending change is created.
4. Apply the change in the relevant environment (sandbox or production).

## Expected result

The object moves to the **archived** status once applied. If HubSpot rejects the operation, you'll see the actual error message (usually because the object still has records, associations or properties).

## FAQ

**HubSpot gives me an error when archiving.** HubSpot only allows archiving an object once all of its records, associations and properties have been deleted first. Delete them in HubSpot and apply again.

**What's the difference between archiving and permanently deleting (hard delete)?** Archiving removes the object but keeps its reserved name. Permanent deletion (which frees the name for reuse) is **not available** from the app in this version; do it from HubSpot if you need it.

**Can I recover an archived object?** Recovery is handled from HubSpot according to its policies; the app does not perform it.
