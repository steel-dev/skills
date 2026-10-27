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

If Steel is missing, use the official installer:

```bash
curl -fsS https://setup.steel.dev | sh -s -- --agent
```

Install in the environment where the agent's tools run. Follow prerequisite and
authorization prompts, and report blocked steps instead of claiming setup is complete.

Use the installed Steel executable for the examples below. If `steel` is not on
PATH, use the path reported by the installer (typically `"$HOME/.steel/bin/steel"`)
in every tool call. A shell PATH change may not persist to the next call; switching
to a different CLI package does not fix that environment issue.

Check version and authorization without printing credentials:

```bash
steel --version
steel doctor --preflight
```

If authentication is required, follow `steel login` and the installed CLI's prompts.
Ask the user to complete any required approval without exposing credentials in chat.
Pending authorization is not readiness. Check `--help` for the installed version
rather than assuming a particular login mechanism or unsupported flags.

If the CLI or installed skills look broken, run:

```bash
steel skills doctor
```

Setup diagnostics only check installation/API access. They do not prove that
the client loaded this skill or that the requested browser task succeeded.
A small content check is:

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
steel browser start --session my-task
steel browser navigate https://example.com --session my-task
steel browser snapshot -i --session my-task
steel browser click @e1 --session my-task
steel browser wait --load networkidle --session my-task
steel browser snapshot -i --session my-task
steel browser stop --session my-task
```

Rules:

- Always use the same `--session <name>` on every command.
- Start with default session settings so the API can apply account-compatible limits. Set `--session-timeout` only when the task needs it and the account supports the requested duration.
- Take a fresh `snapshot -i` after navigation or DOM changes because element refs expire.
- Prefer `@eN` refs from snapshots over brittle CSS selectors.
- Use `steel browser batch` when a sequence needs an action and immediate re-snapshot.
- Release/stop sessions created for the task unless the user explicitly asks to keep them open. Do not stop unrelated sessions.

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
