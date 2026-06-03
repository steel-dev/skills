# Mitigation Ladder

Use the smallest change that fits the evidence.

## 1. Confirm The Failure Class

- Normal auth issue: 401, expired login, missing cookies, wrong tenant.
- App issue: validation error, disabled button, broken selector, modal.
- Reliability issue: 403, access denied, challenge page, CAPTCHA loop, proxy tunnel error, suspicious traffic warning.

If evidence is missing, load `steel-session-debugging`.

## 2. Preserve Evidence

Capture status codes, redirects, challenge text, screenshots, console errors, failed requests, and the final URL before changing configuration.

## 3. Identity First

Use profiles for repeated login state and cookies. Use credentials for secure form injection. Avoid adding proxies before fixing missing auth state.

## 4. Behavior Next

Lower concurrency, add realistic waits, reduce repeated identical retries, and verify each step before escalating.

## 5. Network And CAPTCHA

Add Steel-managed proxies only when the plan supports them. Use BYOP when the user supplies a proxy. Add CAPTCHA solving only when the plan and target flow support it.

## 6. Verify

Rerun the smallest failing step. Report what changed, what evidence improved, and what remains uncertain.
