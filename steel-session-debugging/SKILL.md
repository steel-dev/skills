---
name: steel-session-debugging
description: Use this skill when the user provides a failed Steel session ID, failed automation run, timeout, browser error, blocked page, or unexpected result and wants evidence-backed diagnosis from session metadata, browser logs, raw agent logs, semantic traces, replay links, screenshots, network failures, or errors. Do not use for first-pass bot mitigation; collect evidence here, then hand off to steel-reliability for proxy, CAPTCHA, identity, or anti-bot fixes.
license: MIT
compatibility: claude-code,codex,cursor,opencode,pi
metadata:
  owner: steel
  category: debug
  stage: beta
---

# Steel Session Debugging

## Skill Boundary

Use this skill to explain what happened in a failed Steel session and what to change next. Start from evidence, not guesses.

Do not use this skill as the primary place for bot-detection mitigation, proxy strategy, CAPTCHA strategy, login reputation, or retry policy. If the evidence points there, collect enough proof and hand off to `steel-reliability`.

## Setup Check

1. Confirm the user provided a Steel session ID or enough context to identify one.
2. Run `steel doctor --preflight` if CLI auth or API access is uncertain.
3. Prefer Steel CLI diagnostics before raw API calls.
4. Create local artifacts under `.steel-debug/`; do not paste raw logs into chat unless the user asks.

## Investigation Workflow

1. Collect session metadata, browser logs, raw agent logs, semantic agent traces, and viewer/replay links.
2. Redact cookies, bearer tokens, API keys, passwords, form values, and obvious PII before summarizing.
3. Build a timeline: session creation, navigations, actions, waits, console errors, failed requests, CAPTCHA/proxy signals, and final state.
4. Classify the failure using the taxonomy in `references/failure-taxonomy.md`.
5. Produce an evidence-backed diagnosis with a smallest useful verification step.
6. If the fix involves bot detection, proxy, CAPTCHA, identity, pacing, or login persistence, route to `steel-reliability`.

## Output Format

```text
Diagnosis:
- What happened:
- Most likely cause:
- Evidence:
- What to change:
- Verification step:
- Confidence:
```

## Useful Commands

```bash
steel --json sessions get <session-id>
steel --json sessions logs <session-id>
steel --json sessions agent-logs <session-id>
steel --json sessions traces <session-id>
node scripts/collect-session-debug.mjs <session-id>
node scripts/redact-session-debug.mjs .steel-debug/<session-id>/bundle.json
node scripts/summarize-session-debug.mjs .steel-debug/<session-id>/redacted-bundle.json
```

## References

- `references/investigation-workflow.md`: detailed collection and timeline process.
- `references/log-event-types.md`: how to separate metadata, browser logs, raw agent logs, and traces.
- `references/agent-traces.md`: how to read semantic agent trace events.
- `references/network-forensics.md`: request failures, redirects, and blocked-page evidence.
- `references/replay-and-screenshots.md`: viewer, player, HLS, and screenshot usage.
- `references/failure-taxonomy.md`: standard failure classes.
- `references/reliability-handoff.md`: when to load `steel-reliability`.
