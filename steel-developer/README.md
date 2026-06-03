# Steel Developer Skill

Skill for building reusable software on Steel cloud browsers with the Steel SDK, REST APIs, Playwright, Puppeteer, Stagehand, Browser Use, credentials, profiles, proxies, and CAPTCHA APIs.

## Install

From the public Steel skills catalog:

```bash
npx skills add steel-dev/skills --skill steel-developer
```

With the Steel CLI helper:

```bash
steel skills install steel-developer
```

## When to use this skill

Use this skill when writing, debugging, or explaining application code, scripts, reusable workflows, examples, or docs that run on Steel.

Use `steel-browser` instead when the agent should operate a live browser itself via `steel scrape`, `steel screenshot`, `steel pdf`, or `steel browser ...`.

## Contents

- `SKILL.md`: routing, non-negotiables, and workflow guidance.
- `references/cli-setup.md`: CLI auth, doctor, and smoke-test guidance.
- `references/apis.md`: first-party API routing, source-of-truth links, docs-fetching guidance, and API gotchas.
- `references/ecosystem.md`: Steel ecosystem routing for automation libraries, agent frameworks, computer-use integrations, and coding-agent integrations.
- `references/typescript.md`: TypeScript, JavaScript, Playwright, Puppeteer, and Stagehand examples.
- `references/python.md`: Python, Playwright Python, and Browser Use examples.
- `references/anti-patterns.md`: stale patterns the agent must avoid.
- `references/computer-use.md`: computer-use integration guidance.
- `references/live-embed.md`: live and past session embed guidance.
- `references/reliability-handoff.md`: when to load `steel-reliability` or `steel-session-debugging`.
- `evals/evals.json`: eval prompts and assertions for routing, API coverage, and non-negotiable implementation patterns.

The eval file uses `assertions` because `agent-skills-eval` grades that key. Older local fixtures may use `expectations`, but those are ignored by this runner.
