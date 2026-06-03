# Steel Skill Creator

Compiles a recurring web task into a reusable, parameterized agent skill by driving the task twice in Steel, comparing traces, authoring a concise `SKILL.md`, and verifying with a third run.

## Install

```bash
npx skills add steel-dev/skills --skill steel-skill-creator
```

## Example Prompts

- "Turn my weekly vendor price check into a reusable skill."
- "Make a skill from this recurring login-gated report workflow."
- "Capture this browser task twice and generate a parameterized skill."

## Files

- `SKILL.md`: two-trace creation workflow.
- `references/`: trace anatomy, Steel primitives, authoring, parameterization, evals, and verification.
- `scripts/`: trace fetch, trace compare, scaffold, validate, and install helpers.
- `templates/browser-task-skill/`: starter scaffold for generated browser task skills.
- `evals/evals.json`: creation workflow assertions.

## Development

Run validation from the repository root:

```bash
node scripts/validate-skills.mjs
```
