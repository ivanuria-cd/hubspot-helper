# Edit a custom object

**Prerequisites:** having at least one custom object created or in draft.
**Estimated time:** 3–5 minutes

You can adjust an object's labels, display properties, required properties and associations. The **internal name cannot be changed**.

## Steps

1. Open **CRM → Custom objects**.
2. Click the object you want to modify to open its detail panel.
3. Click **Edit**: the wizard opens with the current data.
4. Change what you need:
   - Labels (singular/plural) and description.
   - Primary, secondary, required and searchable properties.
   - Associations with other objects.
   - The **Internal name** field appears locked.
5. Click **Save**. If the object already exists in HubSpot and the definition differs, an "update schema" pending change will be generated.

## Expected result

If there are differences with HubSpot, the object moves to the **divergent** status (⚠) and a pending change appears. Apply it in sandbox and production to sync.

## FAQ

**I want to add a new property and mark it as required.** The property must exist in HubSpot first. Create it from the **Properties** screen (or include it when creating the object) and then, in the edit view, mark it as required or for display. HubSpot does not allow referencing a property that doesn't exist yet.

**Can I change the type of an existing property?** Not from here: editing the schema does not change the types of properties already created.
