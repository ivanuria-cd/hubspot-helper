# Export JSON by origin

**Prerequisites:** having at least one origin with mapped properties.
**Estimated time:** 2 minutes

The export generates a JSON file with the properties linked to an origin, including the source field and the transformation rules. It is an integration contract designed so that the development team knows exactly what to send to HubSpot and how to transform each value.

## Steps

1. Go to **CRM → Properties**.
2. Click **Export JSON**. A menu opens with one item per project origin.
3. Select the origin you want to export.
4. The browser downloads a file named `{origin-name}_{date}.json`.

## What the file contains

- `schema_version`: the contract version (currently 1).
- `origin`: the origin's identifier, name and type.
- `exported_at`: the date and time of the export.
- `properties`: for each property mapped to that origin, its technical name, label, object, type, source field and the transformations (source value → HubSpot value).

## Expected result

A downloaded JSON file, ready to share with the development team or attach to the integration documentation.

## FAQ

**Is the JSON saved to Google Drive?** No. The export is generated on demand and downloaded locally; it is not automatically stored in Drive.

**Why export by origin and not everything together?** Each origin usually corresponds to a different integration; the per-origin contract is exactly what whoever develops that integration needs.
