# Stealth And Anti-Bot

Frame this as reliability for legitimate automation. Do not promise bypass.

## Signals

- 403 or access denied after navigation
- "verify you are human" page
- Cloudflare, PerimeterX, DataDome, Akamai, or similar challenge copy
- redirect loops to challenge pages
- successful login followed by immediate logout or blocked dashboard
- empty content while browser logs show blocked API calls

## Safe Strategy

1. Confirm the signal with logs, screenshot, or trace.
2. Check feature access.
3. Use profiles for persistent identity.
4. Slow down repeated actions and reduce concurrency.
5. Add proxy/CAPTCHA features only when supported and justified.
6. Verify with a focused rerun.

## Avoid

- claims that Steel can guarantee access to any site
- advice to evade paywalls, account bans, or access controls
- adding all stealth options before collecting evidence
- treating every timeout as bot detection
