# CAPTCHAs

Use CAPTCHA solving only when the plan supports it and the target flow allows it.

## Detect

Look for:

- visible reCAPTCHA, hCaptcha, or Turnstile iframes
- "verify you are human" text
- repeated challenge redirects
- session CAPTCHA status showing detected or solving tasks

## Auto Solve

```ts
const session = await client.sessions.create({
  solveCaptcha: true,
});
```

## Manual Mode

Use manual mode when the workflow needs to inspect status and trigger a specific task:

```ts
const session = await client.sessions.create({
  solveCaptcha: true,
  stealthConfig: { autoCaptchaSolving: false },
});

const states = await client.sessions.captchas.status(session.id);
await client.sessions.captchas.solve(session.id, { taskId });
```

## Failure Handling

- Check plan first.
- Handle failed statuses and timeouts explicitly.
- Combine CAPTCHA solving with profiles and realistic pacing when login reputation matters.
- Do not retry the same CAPTCHA loop indefinitely.
