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

## Fallbacks

- default datacenter networking
- profiles and credentials
- lower concurrency and better pacing
- BYOP via an environment variable
- user upgrade or plan change
