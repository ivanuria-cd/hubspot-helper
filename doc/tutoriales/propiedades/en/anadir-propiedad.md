# Add a property to the map

**Prerequisites:** an open project. For the property to be reconciled against HubSpot, it's best to have the HubSpot connector configured.
**Estimated time:** 5 minutes

The property map is the master list of the project's properties and their planned definition in HubSpot. You can add properties in two ways: by importing them from HubSpot when syncing, or by adding them manually when they don't yet exist in the portal.

## Steps

1. Go to **CRM → Properties**.
2. Click **Property** (button in the action bar). The "Add property" dialog opens.
3. Fill in the fields:
   - **Technical name (HubSpot)**: the property's internal name, for example `custom_tier`.
   - **Label**: the readable name users will see.
   - **Object**: which object it belongs to (contacts, deals or companies).
   - **Type**: the data type (text, number, date, enumeration, etc.).
   - **Field type**: how it is entered (text, select, checkbox…).
   - **Group**: the HubSpot property group it will live in.
   - **Description** (optional).
4. Click **Create**. The property appears in the table with the **missing** status (it does not exist in HubSpot yet).
5. Click the row to open the side panel and link origins to it (see the tutorial "Map origins and transformations").

## Expected result

The property stays in the map with the `missing` status. When you sync with HubSpot a "Create property" pending change will be generated that you can review and apply.

## FAQ

**Does creating the property here create it in HubSpot?** No. The app never writes to HubSpot automatically. Creating the property in the portal requires applying the pending change explicitly.

**Can I edit a property imported from HubSpot?** You can edit its label and description; the rest of the fields reflect the portal's actual state.
