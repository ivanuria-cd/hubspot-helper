# Create a custom object

**Prerequisites:** having the HubSpot connector configured (at least one environment) and an open project.
**Estimated time:** 5–10 minutes

Custom objects let you represent in HubSpot entities specific to your business (machines, contracts, vehicles…) that don't fit the standard objects. This screen creates the object's **definition**; records (instances) are managed afterwards in HubSpot.

## Steps

1. In the side menu, within **CRM**, open **Custom objects**.
2. Click **Custom object** to open the creation wizard.
3. **Identity**:
   - **Internal name**: technical identifier (lowercase letters, numbers and underscores only; must start with a letter). **You won't be able to change it later.**
   - **Singular label** and **Plural label**: what the object will be called in the interface (e.g. "Machine" / "Machines").
   - **Description** (optional): what the object is for.
4. **Initial properties**: add the properties the object will have. For each one, provide an **Internal name** (technical identifier), **Label**, **Type** and **Field type**. The **Field type** is a dropdown that adjusts automatically to the chosen type (you don't have to guess the value). Check **Unique** if that property uniquely identifies each record. Use **Add property** to add more.
5. **Display** (the dropdowns show each property's **label**):
   - **Primary property**: the property that names each record (required).
   - **Required**, **Secondary** and **Searchable**: select, among the defined properties, which are required, which are shown under the name and which are indexed for search.
6. **Associations** (optional): choose which objects (contacts, companies, other custom objects) it can be related to.
7. Click **Save**. The object is added as a **draft** with a "create" pending change.

## Expected result

The object appears in the list with **draft** status (✕). It does not exist in HubSpot yet: to create it, go to its pending changes and apply it first in sandbox and then in production (see "Apply object changes in HubSpot").

## FAQ

**Why can't I change the internal name later?** It's a HubSpot restriction: the name is immutable once the object is created. Labels can be changed.

**Do I have to create all the properties here?** No. You can create the object with the minimum and add more properties later from the **Properties** screen.
