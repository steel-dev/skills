# Network Forensics

Use network evidence to distinguish normal app errors from Steel/session/reliability failures.

## Signals To Collect

- final URL and redirect chain
- HTTP 401, 403, 407, 429, and 5xx responses
- failed requests and browser error codes
- challenge URLs or parameters such as `cf-chl`, `chal_t`, `/sorry/`, or `/captcha`
- proxy errors such as `ERR_TUNNEL_CONNECTION_FAILED`
- blank content with successful status, which may indicate client-side rendering or blocked JS

## Interpretation

- `401` after login usually means missing/expired auth state, not necessarily bot detection.
- `403`, challenge redirects, or access-denied copy often need `steel-reliability`.
- `407` or tunnel failures point toward proxy configuration.
- Repeated failed asset/API calls can explain empty pages even when the main document loads.

## Output

Include at most the relevant URLs, status codes, and error strings. Redact query parameters when they include tokens, emails, account IDs, or session context.
