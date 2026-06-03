# Agent Traces

Agent traces are the first place to understand what the automation attempted.

## What To Inspect

- action type: click, fill, type, wait, navigate, extract, screenshot
- target element accessible name
- selector candidates and element refs
- input values after redaction
- URL before and after the action
- idle gaps and wait points
- action result, error, or timeout

## Common Trace Findings

- stale selector or `@eN` ref used after navigation
- click landed on the wrong matching element
- wait condition too weak or too strict
- form submit caused a redirect to a challenge/login page
- page changed shape between snapshot and action
- action succeeded but extraction read from the old page state

## Diagnosis Pattern

Quote the action and result in plain English:

```text
The agent clicked "Continue" at 12:04:18, then waited for network idle. The next trace event shows the URL changed to /challenge instead of /dashboard.
```

Then connect it to the browser/network evidence before recommending a fix.
