---
name: steel-reliability
description: Use this skill when a Steel automation appears unreliable because of bot detection, CAPTCHA loops, 403/access-denied or verify-you-are-human pages, proxy failures, profile or identity problems, credential or login persistence issues, suspicious pacing, redirect loops, or retry strategy, or when the user asks about stealth, proxies, CAPTCHA solving, profiles, credentials, or reliable logins. Do not use as a first step for unknown failed sessions; collect evidence with steel-session-debugging first when needed.
license: MIT
compatibility: claude-code,codex,cursor,opencode,pi
metadata:
  owner: steel
  category: reliability
  stage: beta
---

# Steel Reliability

## Skill Boundary

Use this skill to plan and verify legitimate reliability improvements for Steel browser workflows.

Do not promise guaranteed bypass. Do not provide advice for evading access controls or violating site terms. Start with the least invasive change that fits the evidence.

If the user has a failed session but no evidence yet, load `steel-session-debugging` first.

## Setup Check

1. Confirm `steel doctor --preflight` passes.
2. Confirm whether the user has a failed session ID, screenshot, logs, or error text.
3. Check feature access before enabling paid CAPTCHA or Steel-managed proxy features.
4. Preserve evidence before changing configuration.

## Mitigation Ladder

1. Determine whether the failure is normal auth/app behavior or likely anti-bot/reliability.
2. Preserve evidence: status codes, redirects, challenge text, screenshots, console errors, failed requests.
3. Use profiles when login state, cookies, or reputation matter.
4. Add realistic pacing and lower concurrency.
5. Add Steel-managed proxies only when feature access supports them, or BYOP when the user supplies a proxy.
6. Add CAPTCHA solving when feature access supports it and the target flow allows it.
7. Tune stealth config only with clear justification.
8. Verify by rerunning the smallest failing step.

## Feature Check

```bash
curl -sSfL "https://api.steel.dev/v1/details" \
  -H "steel-api-key: $STEEL_API_KEY" | jq -r '.plan'
```

On Hobby plans, do not silently enable Steel-managed `useProxy` or CAPTCHA solving. Use defaults, BYOP when supplied, profiles, pacing, or ask the user to upgrade.

## References

- `references/mitigation-ladder.md`: staged diagnostic and mitigation workflow.
- `references/stealth-and-antibot.md`: challenge signals and acceptable framing.
- `references/feature-access.md`: plan checks and feature gates.
- `references/proxies.md`: Steel-managed proxies, geotargeting, and BYOP.
- `references/captchas.md`: detection, status, manual solve, and failure handling.
- `references/profiles-and-identity.md`: persistent identity and session context.
- `references/credentials.md`: secure login injection patterns.
- `references/pacing-and-behavior.md`: rate, wait, retry, and concurrency guidance.
- `references/failure-signals.md`: what evidence suggests each reliability class.
- `references/session-debugging-handoff.md`: when to collect more evidence first.
