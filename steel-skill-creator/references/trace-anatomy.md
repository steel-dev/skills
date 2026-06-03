# Reading a Steel agent trace

Use this when you have trace JSON from `steel sessions traces <session-id> --json` or `~/.claude/skills/steel-skill-creator/scripts/fetch_trace.mjs` and need to extract meaning from it.

## What the trace contains

The trace JSON has the shape:

```json
{
  "session_id": "...",
  "event_count": 24,
  "events": [ /* AgentActivity records */ ]
}
```

Each event is one *coalesced* unit of user activity. Coalescing means: ten keystrokes become one `input(len=10)`, two rapid clicks become one `dblclick`, a redirect chain becomes a series of `navigate` events (one per distinct URL).

## The fields that actually matter

For each event, look at these first — in order:

1. **`type`** — `click`, `dblclick`, `input`, `keyPress`, `navigate`, `scroll`, `drag`, `submit`, `error`. This tells you what kind of action it is.
2. **`target.accessibleName`** — the human-readable label of the element (button text, input label, link text). **This is the single most important field.** It is what you should use when writing the generated skill's steps. "Click the *Direct flights only* checkbox" is a thousand times more durable than `click div:nth-of-type(3) > input`.
3. **`page.url`** — the URL the event happened on. Group consecutive events by URL to identify page boundaries.
4. **`target.attributes`** — `id`, `data-testid`, `aria-label`, `name`, `href`, `placeholder`, etc. Useful when `accessibleName` is empty or generic.
5. **`target.selector`** — a prioritized list: `testId`, `id`, `aria`, `name`, `css`, `xpath`. Use this as evidence for available selectors. When writing generated skill steps, prefer a specific accessible name or visible text; if that is missing or too generic, walk this selector list top to bottom and pick the first intentional, stable selector.
6. **`value`** — present on `input`, `keyPress`, `submit`. For inputs, the field type and length (sensitive values are replaced with `<redacted>`). This is where you identify parameters that came from the user typing.
7. **`pointer.x`, `pointer.y`** and **`target.boundingBox`** — coordinates. Useful for sanity checks and for grid-like UIs (e.g., tic-tac-toe cells) where geometry *is* the semantics. Otherwise, prefer the accessibleName/selector path.

## Signals you should care about

### Page boundaries
A change in `page.url` between consecutive events is a page transition. In the markdown export this is a `##` heading. Use these to chunk the trace into *phases* of the flow.

### Idle gaps
If consecutive events are far apart in time (you'll see `*(idle Xs)*` in the markdown export, or a large delta in the JSON timestamps), the activity *after* the gap is something that had to wait for the page to do something. This is where the generated skill needs `wait --load networkidle`, `wait -t "<text>"`, or `wait --selector`. Use the next event's target to decide which wait to emit:
- Next event interacts with an element identified by visible text → `wait -t "<that text>"`.
- Next event interacts with an element identified by a structural selector → `wait --selector "<that selector>"`.
- Next event is just a navigation following a click → `wait --load networkidle`.

### Pointer-at-(0,0) clicks
These are eval-driven clicks (the script called `element.click()` rather than dispatching a synthetic mouse event). They are valid clicks — they just don't carry real coordinates. Use the selector or accessibleName, ignore the (0,0).

### Zero-displacement drags
A `drag` with identical start and end coordinates is almost certainly a misclassified click. Treat it as a click on the target. This is a known coalescing artifact (we encountered it in the tic-tac-toe trace).

### `error` events
Page-level JavaScript errors logged by the page. Worth scanning — if an error appears next to a step in the trace, the original flow may have been semi-broken even if it appeared to succeed. Flag for the user.

### Login flows
Look for `input` events on fields where the attribute set includes `type=password`, `autocomplete=current-password|new-password`, or names like `password`, `passwd`, `pwd`. When you see one, do not parameterize the credentials in the generated skill — see `steel-primitives.md`, use the credentials vault.

## Reading two traces in parallel for parameter extraction

You will be reading trace #1 (your first run, with the user's example inputs) and trace #2 (your second run, with mutated inputs) together. The mechanic:

1. Align the two by event index, starting from the first navigation each.
2. Walk forward. For each pair of corresponding events:
   - If `type` and `target` shape are the same and the `value` or URL query string differs → this is a **parameter**. Note its position, the two observed values, and what kind of field/URL it was.
   - If both are identical → **invariant**. The generated skill will hardcode it.
   - If structurally different (different element type, different page) → the flows diverged. Stop and investigate. Maybe the AI showed a modal in one run and not the other; maybe the page restructured. Decide whether the divergence matters before continuing.

3. When you have a set of parameters, give them names based on what they *mean* on the page where they appear — read the surrounding labels, the URL path, the form's purpose. `depart_date`, not `var_2`.

## Things that look like data but probably aren't parameters

- Pointer coordinates (unless the UI is a coordinate grid like a game board).
- Scroll positions.
- Tracking-shaped URL params: `chal_t=`, `gclid=`, `sei=`, `aid=`, `label=`, `force_referer=`. These are noise. Strip them.
- Timestamps in URLs.
- Cookie banner / modal-dismiss clicks that only appeared in one trace. Treat as opportunistic handlers, not parameters.

## When the trace tells you the source URL pattern

URL query strings are gold for parameterization. If trace #1 has `?from=SPU&to=FCO&depart=2026-06-13` and trace #2 has `?from=JFK&to=LAX&depart=2026-07-04`, the generated skill's navigation step becomes a templated URL — no clicks needed at all for that part of the flow. Always prefer templated URLs over click sequences when both achieve the same state. Fewer DOM dependencies = a more durable skill.
