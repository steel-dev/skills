---
name: steel-browser
allowed-tools:
  - "Bash(steel:*)"
description: 'Use this skill for live web tasks where WebFetch or curl would fail or be insufficient: JavaScript-rendered pages, forms, screenshots, PDFs, downloads, login flows, CAPTCHA/bot-protection flows, and multi-step navigation. It runs a real Steel cloud browser through the Steel CLI. Use when the agent should visit, click, type, scrape, screenshot, download, or extract now, or the user wants to watch that browser task. Do not use for writing reusable Steel SDK/API code; use steel-developer. For failed-session investigation use steel-session-debugging; for bot detection, proxies, CAPTCHA, or identity use steel-reliability.'
license: MIT
compatibility: 'Steel CLI v0.5.0 or later; a coding agent with shell and file-reading tools. Native skill discovery is optional.'
metadata:
  owner: steel
  category: operate
  stage: ga
---

# Steel Browser

Use Steel CLI to complete the user's live web task, verify the result, and clean
up the browser sessions created for that task. Keep this skill loaded for later
browser work; setup instructions are only the entry point.

## Setup and readiness

If Steel or the skill installation is missing, follow
https://setup.steel.dev/install.md in the environment where your tools run.
Do not assume a host installation is available inside a remote sandbox.

Use the installed executable consistently. If `steel` is not on PATH, substitute
the reported path, typically `"$HOME/.steel/bin/steel"`, in every command below.
A shell export may not persist to the next tool call; a different CLI package
is not a PATH fix.

```bash
steel --version
steel doctor --preflight
```

These examples target v0.5.0. For an older binary, update through the setup guide
before using them. For newer versions, use the installed command's `--help` if
its flags or result fields differ. Browser actions use the HTTP Commands API;
there is no local browser daemon or generic `agent-browser` passthrough.

For device authorization, show the returned approval URL, wait for the user,
then resume the same setup command/profile as directed by the CLI. Preserve the
original task across this pause. Do not turn pending authorization into a claim
that setup succeeded, or copy credentials into chat or application code.

Load the installed skill through the client's native mechanism, or read its
`SKILL.md` directly if the client has no skill loader. Read the linked references
when needed. Do not reinstall a readable skill merely to prove that it loaded.

## Choose the smallest useful path

- Static page content: `steel scrape <url>`.
- One-shot image or PDF: `steel screenshot <url>` or `steel pdf <url>`.
- Forms, navigation, authentication, or browser-native downloads: a named
  `steel browser` session.
- Reusable application code: `steel-developer`.
- Failure investigation: `steel-session-debugging`; mitigation based on evidence
  of CAPTCHA, proxies, identity, or bot detection: `steel-reliability`.

If another skill is needed but is not installed, install that specific skill
with `steel skills install <skill-name> --agent universal --yes`, then read/load
it. Do not claim a handoff merely by naming an unavailable skill.

If the user requested only setup, report what is ready and suggest one relevant
first task, or offer to summarize a public URL they choose. Wait for their
choice before opening a demo browser. Otherwise continue the task they already
requested.

## Interactive workflow

```bash
SESSION="steel-task-$(date +%s)-$$"
steel --json browser start --session "$SESSION"
steel --json browser navigate https://example.com --session "$SESSION"
steel --json browser snapshot -i --session "$SESSION"
# Replace @e1 with the ref from the current snapshot.
steel --json browser click @e1 --session "$SESSION"
steel --json browser snapshot -i --session "$SESSION"
steel --json browser stop --session "$SESSION"
```

- Use one task-unique name, and pass the same `--session` on every command. Never
  replace an existing session that may belong to another task.
- Start with account-compatible defaults. Set a create-time `--timeout` only
  when the task requires it and the account supports the requested duration.
- Refresh snapshots after navigation or DOM changes; use their refs instead of
  guessing stale selectors. Batch only known ordered actions.
- Prefer a specific visible state or expected text over an unnecessary
  `networkidle` wait on continuously active pages.
- Pass `--json` for machine-readable results, even when output is piped. Read
  `success` and `data`; a command exiting is not proof the task result is correct.
- Once a session is created, stop that exact session on completion or failure.
  Do not use `stop --all` for task cleanup. Keep it running only when the user
  explicitly asks, and say so.

## Downloads

Click the actual download link, then use **one foreground** download wait in the
same session. Starting the wait in the background before the click can block
the action behind a pending Commands API request and cause a timeout.

```bash
steel --json browser click @e4 --session "$SESSION"
steel --json browser wait --download --output ./report.csv --session "$SESSION"
```

Inspect the saved file and derive the requested answer from its contents before
reporting success. There is no `browser download` subcommand. Read
`references/downloads.md` for timeout recovery, output handling, and failure
evidence; do not blindly click again to recover a download.

## Let the user watch

When the user asks to watch, or accepts an offer to watch the task already being
performed, run `steel browser live --session <task-name>` and present the actual
viewer URL as **Watch your cloud browser**. Continue the useful task, then clean
up its session normally. A viewer is not a separate demo or a reason to leave
the session running. Read `references/live-viewing.md` for the full workflow.

## Troubleshooting and reporting

Use `references/troubleshooting.md` for a small diagnostic/recovery step rather
than retrying blindly. Preserve the failed command and whether recovery worked.
Do not expose tokens, cookies, passwords, or raw credential-bearing logs.

In the final response, distinguish setup readiness, the verified task result,
and session cleanup. Include the local artifact path when relevant. If a task
has not run, timed out, or recovered after a failure, say so instead of treating
a successful doctor check as a task pass.

## References

- `references/steel-browser-commands.md`: v0.5 command patterns and flags.
- `references/steel-browser-lifecycle.md`: ownership, endpoints, profiles, and stop behavior.
- `references/downloads.md`: browser-native file retrieval and timeout recovery.
- `references/live-viewing.md`: share a viewer for the user's task.
- `references/troubleshooting.md`: diagnosis, bounded recovery, and skill handoffs.
- `references/migration-agent-browser.md`: migrate scripts without assuming passthrough.
- `references/resources.md`: maintained docs, SDK examples, and support links.
