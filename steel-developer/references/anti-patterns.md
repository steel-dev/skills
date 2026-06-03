# Anti-Patterns

Do not generate these stale or risky patterns:

- `steelClient`
- `client.createSession`
- `client.releaseSession`
- `Steel(api_key=...)`
- `session.websocketUrl`
- `session.websocket_url`
- Playwright `chromium.connect({ wsEndpoint })`
- top-level `browser.newPage()` for a normal Steel session
- `browser.newContext()` unless the user explicitly needs isolation
- hardcoded API keys, usernames, passwords, TOTP secrets, proxy URLs, or credential placeholders
- creating a session for one-shot scrape/screenshot/PDF when Browser Tools are enough
- using `all_ext` unless the user explicitly asks to load all extensions
- enabling Steel-managed proxy or CAPTCHA features before plan access is checked

Prefer:

- `import Steel from "steel-sdk"`
- `new Steel({ steelAPIKey })`
- `Steel(steel_api_key=...)`
- explicit CDP URL construction
- default context reuse
- cleanup with browser close and session release
- source-of-truth checks for exact API fields and SDK method signatures
