# Create a new form (fields only)

**Prerequisites:** at least one origin and its property entries defined in **CRM → Properties**.
**Estimated time:** 4 minutes

The wizard creates a HubSpot form by defining only its fields from an origin. It does not edit styling, steps, conditional logic or legal consent (that is handled in HubSpot).

## Steps

1. Go to **CRM → Forms** and click **Form**.
2. Enter the form's **name**.
3. Choose the HubSpot **object** (standard or an existing custom object).
4. Select one or more **origins**. The app preselects the fields those origins define for the object.
5. Adjust the field list: check or uncheck each one and edit its label and the **required**/**hidden** flags.
6. Click **Create**. A "create form" **pending change** is generated (nothing is written to HubSpot yet).
7. Apply the change from **Pending changes** (see "Sync changes with HubSpot").

## Expected result

A pending change appears, "Create form "…"". When you apply it, the form is created in HubSpot with type `hubspot` and is automatically linked to the chosen origins.

## FAQ

**Why fields only?** The app's scope is the field structure and its relationship to the origins; the form's design and logic stay in HubSpot.

**Which field type is used?** The one that matches the type of the origin property (for example, a dropdown for an options property); the contact `email` property uses the email field.
