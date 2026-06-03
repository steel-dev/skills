# Parameterization

Use two successful traces to separate variables from invariants.

## Parameter Signals

- URL query values differ at the same conceptual step.
- Form input values differ but field identity stays the same.
- Clicked result labels differ because the input changed.
- Date ranges, IDs, names, routes, locations, or search terms change.

## Invariant Signals

- start URL or domain remains the same
- same form labels and buttons are used
- same wait points appear
- same success signal appears
- same auth/profile requirements apply

## Naming

Name parameters by meaning:

- `origin_airport`, not `param_1`
- `report_date`, not `date_input`
- `customer_id`, not `id`

Do not include session IDs, trace IDs, timestamps, or incidental scroll offsets as parameters unless the user explicitly requires them.
