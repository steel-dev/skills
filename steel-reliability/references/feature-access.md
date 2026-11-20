# Feature Access

Check plan access before enabling Steel-managed proxies or CAPTCHA solving.

```bash
curl -sSfL "https://api.steel.dev/v1/details" \
  -H "steel-api-key: $STEEL_API_KEY" | jq -r '.plan'
```

## Rules

- `STEEL_API_KEY` or `steel login` must be configured before checking.
- Hobby plans should not silently enable Steel-managed proxies or CAPTCHA solves.
- BYOP is distinct from Steel-managed proxy bandwidth and can be used when the user supplies a proxy server.
- When access is missing, explain the fallback instead of generating code that will fail.

## Launch: Verified Account

On the Launch plan, CAPTCHA solving and Steel proxies need a verified account.
Until then, session creation with either is refused with `403` and
`code: "deposit_required"`.

- Tell the user; don't drop the feature silently. For example: "Tell your user:
  verify your Steel account once at https://app.steel.dev/overview?open=verify-account
  by adding $10 of credits. The credits stay in your balance for sessions, and
  CAPTCHA solving and Steel proxies stay on."
- If you continue without the feature, say so in your reply with the same link.
  Sites with bot protection may block the session without it.

## Fallbacks

- default datacenter networking
- profiles and credentials
- lower concurrency and better pacing
- BYOP via an environment variable
- user upgrade or plan change
