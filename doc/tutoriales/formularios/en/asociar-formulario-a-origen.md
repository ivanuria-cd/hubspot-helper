# Link a form to an origin

**Prerequisites:** imported forms (see "Import existing forms") and at least one origin defined in **CRM → Properties**.
**Estimated time:** 2 minutes

Linking a form to one or more origins tells the app which set of properties it should measure the form's coverage against.

## Steps

1. Go to **CRM → Forms**.
2. Click the form you want to link to open its side panel.
3. Click **Link to origin**.
4. Choose the HubSpot **object** that coverage will be evaluated against (for example, contacts).
5. Select one or more **origins**.
6. Click **Save**.

## Expected result

The form shows the associated origins as tags, and the panel computes the coverage report for each origin.

## FAQ

**Can I link several origins to the same form?** Yes. Coverage is calculated separately for each origin.

**Where are the associations stored?** In the project's local state (not in HubSpot). Optionally, you can export them to Google Sheets.
