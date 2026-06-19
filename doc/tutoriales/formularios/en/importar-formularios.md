# Import existing forms

**Prerequisites:** the HubSpot connector configured in the project (with the `forms` scope).
**Estimated time:** 3 minutes

Importing brings every form in the portal into the app — both those from the new tool and those captured from the legacy tool — so you can link them to origins and review their coverage.

## Steps

1. Go to **CRM → Forms**.
2. Check the top bar to see which HubSpot environment is active (production or sandbox).
3. Click **Sync HubSpot**. The app reads the forms via the Marketing Forms API v3 (and, as a fallback, the read-only legacy v2 API for very old forms).
4. When it finishes you'll see a summary of how many forms were imported and how many were updated.

## Understanding the form types

- **hubspot**: a HubSpot form (new or legacy editor). It is the only type the app can create.
- **captured**: an external HTML form captured by the non-HubSpot forms tool (the "legacy" capture).
- **flow**: a pop-up form.
- **blog_comment**: a blog comment form.

## Expected result

The table shows each form with its type and coverage status. You can search by name and filter by type or coverage.

## FAQ

**Does importing modify HubSpot?** No. It only reads. HubSpot remains the source of truth for forms.

**Why doesn't a form show up?** If it's very old it may only exist in the legacy tool; the sync still tries to import it as read-only.
