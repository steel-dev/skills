# Authoring Workflow

1. Gather a clear recurring task, success criteria, allowed domains, and one example input set.
2. Decide whether the flow is safe to record twice. Ask before side-effecting flows.
3. Record trace one with the example inputs.
4. Record trace two with changed inputs and the same intent.
5. Compare traces for stable steps, variables, selectors, auth assumptions, and wait points.
6. Scaffold a concise generated skill.
7. Write evals for happy path, changed parameter, and common failure.
8. Install locally and verify with a third input set.

Generated `SKILL.md` files should be short, imperative, and one level deep. Put detailed examples or scripts in references.
