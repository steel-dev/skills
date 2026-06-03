# Reliability Handoff

Stay in `steel-session-debugging` when the task is to collect evidence and explain what happened.

Load `steel-reliability` when the next step is to design or implement mitigation for:

- bot detection
- access denied or challenge pages
- CAPTCHA loops or failed solves
- Steel-managed proxy or BYOP proxy failures
- persistent login/profile identity problems
- suspicious pacing, high concurrency, or retry policy
- reputation-sensitive domains

## Handoff Format

```text
Evidence collected:
- ...

Why this is a reliability problem:
- ...

Load steel-reliability to plan the mitigation ladder.
```

Do not promise guaranteed bypass. Frame the next step as legitimate automation reliability and verification.
