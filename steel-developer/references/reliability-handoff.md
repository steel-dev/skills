# Reliability Handoff

Stay in `steel-developer` when the user is writing minimal implementation code and only needs the option shape for profiles, credentials, proxies, or CAPTCHA.

Load `steel-reliability` when the user is diagnosing or mitigating:

- 403 or access denied responses
- "verify you are human" pages
- CAPTCHA loops or failed solves
- Steel-managed proxy or BYOP proxy failures
- profile reputation or persistent login problems
- pacing, concurrency, retries, or suspicious traffic

Load `steel-session-debugging` first when the failure class is unknown or the user provides a session ID and asks what happened.

## Minimal Code Here

This skill may show small snippets such as:

```ts
const session = await client.sessions.create({
  useProxy: { server: process.env.PROXY_SERVER! },
});
```

But reliability strategy, escalation, and verification belong in `steel-reliability`.
