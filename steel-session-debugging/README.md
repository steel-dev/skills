# Steel Session Debugging Skill

Diagnoses failed Steel browser sessions from metadata, logs, traces, replay links, and network evidence.

## Install

```bash
npx skills add steel-dev/skills --skill steel-session-debugging
```

## Example Prompts

- "Debug Steel session `sess_123` and tell me why login failed."
- "This run timed out after clicking submit. Use the session ID and find the cause."
- "Summarize the agent traces and browser logs for this failed run."

## Files

- `SKILL.md`: routing, setup checks, workflow, and output format.
- `references/`: investigation, logs, traces, network, replay, taxonomy, and reliability handoff.
- `scripts/`: local collection, redaction, and summary helpers.
- `evals/evals.json`: routing and behavior assertions.

## Development

Run the validation script from the repository root:

```bash
node scripts/validate-skills.mjs
```
