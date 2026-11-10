# Session lifecycle and endpoints (v0.5.0)

Use this reference for ownership, endpoint selection, profiles, and release.
The CLI sends browser actions to Steel's HTTP Commands API; it does not manage
a local browser daemon or inject CDP arguments into another CLI.

## Create one task-owned session

```bash
SESSION="steel-task-$(date +%s)-$$"
steel --json browser start --session "$SESSION"
```

Retain the returned name/ID as the task's ownership record. A unique name avoids
replacing a saved session from another task. In v0.5, starting an existing name
replaces its saved session and reports whether the prior session was released;
do not use replacement as a generic recovery strategy.

Creation options include `--timeout <milliseconds>`, `--inactivity-timeout`,
`--stealth`, `--proxy <url>`, `--solve-captcha`, `--profile`, `--update-profile`,
`--namespace`, `--credentials`, and `--metadata KEY=VALUE`. Use only options the
task needs and the account supports. `--session-timeout` is an alias for
`--timeout`; neither is the action-wait timeout.

The default inactivity timeout is ten minutes in v0.5; the session lifetime is
also bounded by its create-time timeout/account policy. Read actual start
output rather than inventing an expiry. A timeout is a backstop, not a substitute
for releasing a session when the task ends.

## Use and stop the same session

```bash
steel --json browser navigate https://example.com --session "$SESSION"
steel --json browser snapshot -i --session "$SESSION"
steel --json browser stop --session "$SESSION"
```

After successful creation, arrange an exact-session stop on both completion and
failure. Retrieve artifacts before stopping. If the stop fails, retain the
ownership details for recovery and report cleanup as unresolved.

For a session created elsewhere, actions can use `--session <session-id>`.
Stopping an ID-attached session only forgets the local attachment; it does not
release the cloud browser. `browser stop --all` also leaves attached sessions
running. Release an external session only when explicitly authorized:

```bash
steel --json sessions get <session-id>
steel --json sessions release <session-id>
```

Do not use `browser stop --all` or `sessions release --all` as task cleanup or a
default reset. If independent release proof is needed, query the exact owned
ID and check its returned status rather than listing/releasing an account's
sessions.

## Endpoint selection

The API URL precedence is:

1. `--api-url <url>`.
2. `--local`: configured `browser.apiUrl`, or `http://localhost:3000/v1`.
3. `STEEL_API_URL`.
4. `https://api.steel.dev/v1`.

Use one endpoint and mode consistently across the workflow. The old
`STEEL_BROWSER_API_URL` and `STEEL_LOCAL_API_URL` precedence rules and generic
`--cdp`/`--auto-connect` passthrough do not apply to v0.5.

Device credentials are bound to their authorization context and are not
forwarded to a different API origin. For self-hosted use, configure the intended
endpoint/authentication rather than copying a cloud device grant. The server
must enable `ENABLE_COMMANDS_API=true`; `steel dev start` does not set it for you.

## Inspect and watch

```bash
steel --json browser sessions
steel browser live --session "$SESSION"
```

`browser live` prints the viewer URL; it does not open the user's browser. Use
`references/live-viewing.md` when sharing it. `browser sessions` is text by
default; pass `--json` for automation, not `--raw`. Displayed connection URLs
redact sensitive fields; do not reconstruct credential-bearing connection URLs
from display output or expose raw auth state.

## Profiles and CAPTCHA

Import a browser profile when the task requires reusable authenticated state;
do not assume an unknown profile name is created by `start`:

```bash
steel profile import --help
steel --json browser start --session "$SESSION" --profile myapp --update-profile
```

`--profile` loads an existing profile. `--update-profile` requests persistence
back to that profile, and allows creation when supported by the CLI. Use these
only when the user intends to persist the browser's state.

For manual CAPTCHA solving, create the task's session with `--solve-captcha`
when the account supports it; `--stealth` enables the automatic-solving preset.
Observe the actual session state rather than assuming a solve succeeded:

```bash
steel --json browser captcha solve --session "$SESSION"
steel --json browser captcha status --wait --session "$SESSION"
```

For repeated challenges or identity/proxy issues, load `steel-session-debugging`
to collect evidence, then `steel-reliability` for mitigation. Do not discard an
existing session or change account configuration just to try another guess.
