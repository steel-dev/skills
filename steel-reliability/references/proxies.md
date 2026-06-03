# Proxies

Start without proxies unless the evidence points to IP reputation, geolocation, or network blocking.

## Steel-Managed Proxy

Use after plan access is confirmed:

```ts
const session = await client.sessions.create({ useProxy: true });
```

Prefer broad geotargeting before narrow geotargeting:

```ts
const session = await client.sessions.create({
  useProxy: { geolocation: { country: "US" } },
});
```

## Bring Your Own Proxy

Use BYOP when the user supplies a proxy or the plan does not include Steel-managed proxy bandwidth:

```ts
const session = await client.sessions.create({
  useProxy: { server: process.env.PROXY_SERVER! },
});
```

Keep proxy credentials in environment variables. Do not print proxy URLs with credentials in logs.

## Failure Handling

- Retry transient `ERR_TUNNEL_CONNECTION_FAILED`.
- Fall back to default networking if proxy failures dominate.
- Preserve status code and target host before swapping.
- Do not rotate repeatedly without changing any other factor.
