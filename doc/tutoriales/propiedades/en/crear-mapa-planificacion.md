# Create and reimport the planning field map

**Prerequisites:** an open project, the Google Drive connector configured with a working folder and, to reconcile with the portal, the HubSpot connector. It helps to have the data origins and their fields defined.
**Estimated time:** 10 minutes

The planning field map is an **editable** Google Sheets document that the app generates so the client can decide, right on the document, how each source field maps to a HubSpot property. Unlike the state file, this document is meant to be filled in by hand: it has dropdowns, one tab per object and catalog sheets per origin. When the client returns it filled in, the app reads it back, shows you a summary of the changes and creates drafts that you then review.

## Steps

1. Go to **CRM → Properties**.
2. Click **Generate planning map**. The app creates (or updates) in your Drive folder a Google Sheets with:
   - a **Legend** sheet explaining the columns and states;
   - one tab per HubSpot object, with the HubSpot block (Custom, Name, Internal name, Type…) and a block per applicable origin (Field name, Origin, Comments);
   - an **Origin …** sheet per source system, with the calculated destination property;
   - an **Associations** sheet (informational only).
3. Share the document with the client. On each object tab they can fill, using the dropdowns:
   - **Custom**: `No` (already exists), `Yes (Pending)` (to create) or `Yes (Created)` (already created);
   - **Field name**: the source field that feeds the property;
   - **Origin**: `Migration` or `Integration`;
   - **Type**: the field type in plain language (text, number, currency, phone…).
4. When the document is filled in, go back to **CRM → Properties** and click **Import planning**.
5. If there are changes compared to the project, a **change summary** opens (additions, removals, mapping or type changes) and, where applicable, the list of **fields that need action**: ambiguous types (for example, «choice», which could be a dropdown, checkboxes or radio buttons) that must be pinned down. Nothing is applied yet.
6. Review the summary and click **Create drafts**. The app creates or updates the map entries. Fields with an unresolved type stay **blocked** and are not created until you specify the concrete type.
7. The entries remain as drafts in the map. Review them, sync with HubSpot and apply the changes with the usual flow (see «Sync with HubSpot» and «Apply changes in HubSpot»).

## Expected result

The planning document is generated in Drive with its dropdowns and, when reimported, the app shows you what changes before touching anything and creates the entries as drafts. Nothing is applied in HubSpot at any point: that still requires syncing and applying explicitly.

## Frequently asked questions

**Does importing apply anything in HubSpot?** No. Importing only creates or updates drafts in the project map. Changes in HubSpot always go through syncing and applying per environment.

**What does it mean that a field «needs action»?** That the chosen plain-language type maps to several HubSpot configurations and you must pin down which one. Until it is resolved, that field is not created.

**Is the document protected?** No. It is editable on purpose, so the client can fill it in. The project state file remains the faithful record and is not touched.

**Can I regenerate it?** Yes. Clicking «Generate planning map» again updates the existing document.
