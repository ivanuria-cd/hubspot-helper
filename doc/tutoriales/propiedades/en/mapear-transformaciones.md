# Map origins and transformations

**Prerequisites:** having at least one property in the map and one origin created.
**Estimated time:** 7 minutes

A mapping connects a property with a data origin, indicating which field in the source system it comes from and what value transformations must be applied so it fits in HubSpot.

## Steps

1. Go to **CRM → Properties** and click the property you want to map. The side panel opens.
2. In the **Mapped origins** section, click **Add origin**.
3. In the "Map origin" dialog:
   - **Origin**: choose the data origin.
   - **Source field**: the field's name in the source system, for example `Account_Tier__c`.
   - **Transformations**: click **Add rule** for each value equivalence. On the left, the value as it arrives from the origin; on the right, the valid value in HubSpot. For example `GOLD → enterprise`.
   - **Notes** (optional): any clarification for the team.
4. Click **Save**. The mapping appears in the panel and in the "Origins" column of the table.
5. To edit or delete a mapping, use the pencil and trash icons next to it in the panel.

## Expected result

The mapping is saved and reflected in the `03_Mapeo_Origenes` sheet of the Google Sheets. The transformations are stored as source value → HubSpot value pairs, ready to be exported in the origin's JSON contract.

## FAQ

**Can I define complex logic in the transformations?** No. For safety, only value equivalences (mappings) are allowed, never scripts.

**Can a property have several origins?** Yes. Add one mapping for each origin that feeds that property.
