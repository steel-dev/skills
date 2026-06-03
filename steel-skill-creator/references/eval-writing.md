# Eval Writing

Every generated skill should have at least three evals:

1. Happy path with the example input shape.
2. Changed parameter path with different inputs.
3. Common failure or negative routing path.

## Assertions

Use the `assertions` key. Assertions should check behavior, not exact prose.

Good assertions:

- "Requests all required inputs before starting"
- "Uses steel-browser primitives for live execution"
- "Does not hardcode the example date"
- "Verifies the success signal before finishing"

Avoid:

- exact paragraphs
- screenshots as the only success criterion
- assertions that require hidden credentials
- claims that cannot be observed from the agent transcript
