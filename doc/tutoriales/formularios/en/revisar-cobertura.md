# Review a form's coverage

**Prerequisites:** a form linked to one or more origins (see "Link a form to an origin").
**Estimated time:** 2 minutes

Coverage tells you whether a form contains all the fields its origin requires for an object. It helps you catch incomplete forms before publishing them.

## Steps

1. Go to **CRM → Forms**.
2. Look at the coverage badge on each form in the table.
3. Click a form to open its panel and see the breakdown by origin: how many properties are expected, how many are present and which are missing.

## Understanding the statuses

- **complete** (lime badge): every field defined by the origin(s) is present in the form.
- **N missing** (warning badge): N fields defined by the origin are missing.
- **no origin** (grey badge): the form is not linked to any origin, so it cannot be evaluated.

## Expected result

In the panel, each expected property is marked as present or missing. If fields are missing, you'll see the **Add missing fields** button.

## FAQ

**Is coverage calculated per object?** Yes. The comparison is by object + the property's technical name; a field from another object does not count.

**Does coverage look at the values or only at the presence of the field?** It only checks that the field (the target property) exists in the form.
