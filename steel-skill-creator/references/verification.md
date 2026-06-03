# Verification

Verify generated skills with a third input set that differs from both recording runs.

## Verification Steps

1. Install the generated skill locally.
2. Start a fresh agent context or ensure the skill can be discovered.
3. Invoke the skill with new inputs.
4. Run the browser task through Steel.
5. Fetch the third trace.
6. Compare outcome fidelity against the first two traces.

## Verdict

Use one of:

- Good: third run reached the same success signal with clean parameter substitution.
- Mixed: success was partial or required manual recovery.
- Failed: the skill did not trigger, selected wrong steps, or missed the success state.

Report caveats plainly and revise the generated skill before calling it ready.
