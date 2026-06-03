# Steel Reliability Skill

Diagnoses and mitigates Steel reliability issues around bot detection, CAPTCHA, proxies, profiles, credentials, login persistence, pacing, and retries.

## Install

```bash
npx skills add steel-dev/skills --skill steel-reliability
```

## Example Prompts

- "My Steel session gets a 403 on this site. Plan the least invasive mitigation."
- "Show me how to use BYOP safely on Hobby without enabling Steel-managed proxies."
- "This login keeps failing across sessions. Should I use profiles or credentials?"

## Files

- `SKILL.md`: boundary, setup checks, mitigation ladder, and references.
- `references/`: reliability runbooks and feature-specific guidance.
- `evals/evals.json`: routing and safety assertions.

## Development

Run the validation script from the repository root:

```bash
node scripts/validate-skills.mjs
```
