# Manage data origins

**Prerequisites:** an open project.
**Estimated time:** 5 minutes

An **origin** represents where a property's data comes from: an integration, a one-off migration, manual entry by users, or a HubSpot workflow. Defining origins well lets you document the property map and export integration contracts by origin.

## Steps

1. In the side menu, go to **CRM → Properties**.
2. Click the **Origins (n)** button in the top bar. The "Manage origins" window opens.
3. You'll see the list of existing origins. To create a new one, fill in the form below:
   - **Name**: a descriptive name, for example "Salesforce Migration Q1".
   - **Type**: choose between Integration, Migration, User or Workflow.
   - **Description** (optional): additional context.
4. Click **Add origin**. The origin appears in the list instantly.
5. To delete an origin, click the trash icon next to it. Deleting it also removes its mappings with properties.
6. Close the window with **Close**.

## When to use each type

- **Integration**: the data arrives from a continuously connected system (for example, a synced ERP).
- **Migration**: the data was loaded once from another system (for example, when migrating from Salesforce).
- **User**: people enter it manually in HubSpot.
- **Workflow**: a HubSpot workflow computes or assigns it.

## Expected result

The origins are saved in the project and reflected in the `01_Origenes` sheet of the property map's Google Sheets. From now on you can link them to properties.

## FAQ

**Can I change an origin's type later?** Yes, the Name, Type and Description fields are editable.

**What happens to the mapped properties if I delete the origin?** That origin's mappings are removed, but the properties remain.
