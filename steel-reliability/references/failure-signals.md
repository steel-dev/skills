# Failure Signals

## Likely Auth Or State

- 401 after login
- redirect back to login
- missing expected cookies
- profile ID absent or wrong namespace
- dashboard loads but user data is missing

Start with profiles, credentials, and session context.

## Likely Bot Detection

- 403 or access denied
- verify-human page
- challenge URLs or iframes
- empty results only on automated runs
- repeated redirects through challenge pages

Collect evidence, then use the mitigation ladder.

## Likely Proxy

- `ERR_TUNNEL_CONNECTION_FAILED`
- proxy auth error
- target works without proxy but fails with proxy
- geolocation mismatch

Check BYOP credentials, Steel-managed feature access, and geotargeting.

## Likely CAPTCHA

- CAPTCHA iframe visible
- solve status failed or timed out
- repeated CAPTCHA after solve

Check plan, solve mode, pacing, and profile reputation.
