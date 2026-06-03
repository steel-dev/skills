# Session Debugging Handoff

Load `steel-session-debugging` before `steel-reliability` when:

- the user only says "it failed" without evidence
- there is a session ID but no known failure class
- you need logs, traces, replay, or screenshot evidence
- the problem may be a selector, wait, app, or session lifecycle bug

## Handoff Prompt

```text
Use steel-session-debugging to collect metadata, browser logs, agent logs, traces, and replay evidence for session <id>. Redact sensitive values, classify the failure, then return here only if the evidence points to bot detection, proxy, CAPTCHA, identity, pacing, or login reliability.
```

Do not skip evidence collection just because the target site is known to be bot-sensitive.
