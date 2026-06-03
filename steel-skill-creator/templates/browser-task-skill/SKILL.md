---
name: __SKILL_NAME__
description: '__DESCRIPTION__'
license: MIT
compatibility: claude-code,codex,opencode
metadata:
  owner: steel
  category: browser-task
  stage: experimental
---

# __SKILL_NAME__

## Purpose

Run a recurring browser workflow with Steel using user-provided inputs.

## Inputs

- Replace this list with the concrete parameters discovered from the two traces.

## Prerequisites

- Steel CLI is installed and authenticated.
- The `steel-browser` skill is available for live browser execution.
- Any required profiles or credentials have been configured before running.

## Workflow

1. Confirm required inputs.
2. Start a named Steel browser session with only the options justified by trace evidence.
3. Navigate to the starting URL.
4. Follow the stable steps identified in the reference trace.
5. Substitute user inputs only where parameters were identified.
6. Verify the success signal.
7. Stop or release the session unless the user asks to keep it open.

## Success Criteria

- The workflow reaches the same kind of final state as the recording traces.
- The output is returned in the format the user requested.
- No trace IDs, session IDs, timestamps, or secrets are included in reusable instructions.

## References

- `references/workflow.md`: task-specific detailed workflow.
- `references/examples.md`: example inputs and outputs.
- `references/troubleshooting.md`: known failure recovery.
