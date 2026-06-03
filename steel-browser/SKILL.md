---
name: steel-browser
allowed-tools:
  - "Bash(steel:*)"
description: 'Use this skill for live web tasks where WebFetch or curl would fail or be insufficient: JavaScript-rendered pages, forms, screenshots, PDFs, login flows, CAPTCHA/bot-protection flows, and multi-step navigation. It runs a real Steel cloud browser through the Steel CLI. Use when the agent should visit, click, type, scrape, screenshot, or extract now. Do not use for writing reusable Steel SDK/API code; use steel-developer for code. If a live task fails, hand off to steel-session-debugging; if evidence points to bot detection, proxies, CAPTCHA, or identity, hand off to steel-reliability.'
license: MIT
compatibility: claude-code,codex,cursor,opencode,pi
metadata:
  owner: steel
  category: operate
  stage: ga
---

# Steel Browser

Use Steel CLI browser tools to complete live web work now.

## Setup

If Steel is missing or unauthenticated:

```bash
steel --version
steel login
steel doctor --preflight
```

If the CLI or installed skills look broken, run:

```bash
steel skills doctor
```

Done when this smoke test succeeds:

```bash
steel scrape https://example.com
```

## Choose The Right Path

- Static page content: `steel scrape <url>`
- Screenshot: `steel screenshot <url>`
- PDF: `steel pdf <url>`
- Multi-step interaction, login, forms, or JS-heavy pages: `steel browser ...`
- Bot detection, CAPTCHA, proxy, or login reliability failure: collect evidence with `steel-session-debugging`, then use `steel-reliability`
- Reusable application code: use `steel-developer`

Start with the smallest tool that can finish the task. Escalate from scrape/screenshot/PDF to an interactive browser session only when interaction or state is required.

## Interactive Session Workflow

```bash
steel browser start --session my-task --session-timeout 3600000
steel browser navigate https://example.com --session my-task
steel browser snapshot -i --session my-task
steel browser click @e1 --session my-task
steel browser wait --load networkidle --session my-task
steel browser snapshot -i --session my-task
steel browser stop --session my-task
```

Rules:

- Always use the same `--session <name>` on every command.
- Take a fresh `snapshot -i` after navigation or DOM changes because element refs expire.
- Prefer `@eN` refs from snapshots over brittle CSS selectors.
- Use `steel browser batch` when a sequence needs an action and immediate re-snapshot.
- Release/stop sessions unless the user explicitly asks to keep them open.

## Troubleshooting

1. Run `steel skills doctor` for install or CLI-skill mismatch issues.
2. Run `steel doctor --preflight` for auth/API issues.
3. Use `steel browser sessions` and `steel browser live --session <name>` for active sessions.
4. For failed completed sessions, load `steel-session-debugging`.
5. For bot/proxy/CAPTCHA/identity fixes, load `steel-reliability`.

## References

- `references/steel-browser-commands.md`: command reference.
- `references/steel-browser-lifecycle.md`: session lifecycle discipline.
- `references/troubleshooting.md`: recovery playbooks.
- `references/migration-agent-browser.md`: migration from upstream `agent-browser`.
