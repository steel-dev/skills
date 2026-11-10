# Troubleshooting Steel browser work

Start with the failing stage and evidence, not a fresh session or a loop of
retries. Record the command, exit/error, installed CLI version, and the exact
task-owned session name/ID privately. Redact credentials before reporting.

## Installation and authorization

```bash
steel --version
steel doctor --preflight
steel skills doctor
```

- **Command not found:** use the previously installed executable's full path in
  each tool call. Shell exports may not persist. If the binary really is absent,
  follow https://setup.steel.dev/install.md; do not switch CLI packages.
- **Older CLI:** this skill targets v0.5.0 or later. Update through the setup
  guide before using version-specific commands.
- **Pending device approval:** show the current approval URL and wait for the
  user, then resume the same setup command/profile as directed by the CLI. No
  localhost callback is needed. If expired, follow the CLI's fresh-request flow.
- **Auth failure:** use the doctor result and CLI login help. `STEEL_API_KEY`, if
  set, takes precedence over device login; do not silently clear it or extract
  a device token as a replacement API key. Do not print auth files.
- **Skill not loaded:** read the installed `SKILL.md` directly if native skill
  discovery is unavailable. A readable installation need not be reinstalled.
- **API/network failure:** check the configured endpoint and report the failing
  check. Do not change origins or repeatedly retry without new evidence.

## Command failure or version mismatch

```bash
steel browser --help
steel browser wait --help
```

Use the installed command's supported flags. Old examples using `--raw`,
`browser close`, `--cdp` passthrough, or a `browser download` subcommand do not
describe v0.5. `--json` is explicit, even when output is piped.

For a download timeout, see `references/downloads.md`. Click first, then one
foreground `wait --download --output` in the same session. Check whether the
action ran or an artifact exists before retrying; do not repeat an export
blindly. Report a recovery as a recovery, not a clean first attempt.

For an ambiguous side-effecting command, retain the execution ID and inspect
its state before replaying it:

```bash
steel --json browser status <execution-id> --session "$SESSION"
```

## Session continuity and cleanup

Use the same session name and endpoint for the task. A new browser appearing
unexpectedly is a reason to inspect the task's saved mapping, not release every
session in the account.

```bash
steel --json browser sessions
steel --json sessions get <owned-session-id>
steel --json browser stop --session "$SESSION"
```

Only stop a session created for this task or explicitly authorized by the user.
Starting an existing name replaces it; use a fresh task-unique name after a
verified stop if a restart is actually necessary. ID-attached sessions are not
released by `browser stop`; read `references/steel-browser-lifecycle.md`.

If the user wants to watch, use the live URL for the existing task session, not
a new debug browser: `references/live-viewing.md`. A missing viewer does not by
itself prove the browser task failed.

## Self-hosted service

Check the single endpoint precedence chain in
`references/steel-browser-lifecycle.md`. The self-hosted browser service must
enable `ENABLE_COMMANDS_API=true`; starting it with `steel dev start` does not
automatically enable Commands API. Do not send a cloud device grant to a
different API origin or build auth-bearing CDP URLs from display output.

## CAPTCHA, login, or bot-detection failures

Collect the failing session's evidence before changing proxy, identity, or
profile settings. If solving is configured for the session/account, inspect its
actual state using supported commands:

```bash
steel --json browser captcha status --session "$SESSION"
steel --json browser captcha status --wait --timeout 120000 --session "$SESSION"
steel --json browser captcha solve --session "$SESSION"
```

Do not assume every challenge is solvable, promise a bypass, or start a new paid
configuration without the user's intent. For deeper investigation, install and
load `steel-session-debugging`; for evidence-backed mitigation, use
`steel-reliability`. These are separate skills and may not have been installed
by browser setup:

```bash
steel skills install steel-session-debugging --agent universal --yes
```

Read `.agents/skills/steel-session-debugging/SKILL.md` after installation (or use
native skill loading). Summarize what failed, what evidence supports the cause,
what changed, whether recovery worked, and whether exact-session cleanup is
verified. For docs and support links use `references/resources.md`.
