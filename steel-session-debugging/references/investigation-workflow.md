# Investigation Workflow

## 1. Confirm Scope

- Confirm the session ID.
- Ask for the expected outcome if the user did not provide it.
- Run `steel doctor --preflight` when auth or API access is uncertain.

## 2. Collect Evidence

Prefer CLI commands:

```bash
steel --json sessions get <session-id>
steel --json sessions logs <session-id>
steel --json sessions agent-logs <session-id>
steel --json sessions traces <session-id>
```

Use `scripts/collect-session-debug.mjs` when you need a local bundle:

```bash
node scripts/collect-session-debug.mjs <session-id>
```

## 3. Redact Before Sharing

Run:

```bash
node scripts/redact-session-debug.mjs .steel-debug/<session-id>/bundle.json
```

Do not paste raw logs, cookies, auth headers, passwords, TOTP values, session context, or form values into chat unless the user explicitly requests it.

## 4. Build A Timeline

Include:

- session status, start time, release/failure time
- navigations and redirects
- agent actions and waits
- console/page errors
- failed network requests
- CAPTCHA/proxy/auth signals
- final page state or last known URL

## 5. Diagnose

Classify the failure, cite evidence, and recommend the smallest next run that can verify the fix.

Avoid unsupported guesses. If a surface is unavailable, say that and lower confidence.
