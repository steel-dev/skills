# TypeScript And JavaScript

Use this file for Node.js, TypeScript, JavaScript, Playwright, Puppeteer, and Stagehand tasks.

## Install

```bash
npm install steel-sdk playwright puppeteer-core
```

Use `STEEL_API_KEY` from the environment. Do not hardcode API keys or target-site credentials.

## Playwright

```ts
import Steel from "steel-sdk";
import { chromium } from "playwright";

const steelAPIKey = process.env.STEEL_API_KEY;
if (!steelAPIKey) throw new Error("STEEL_API_KEY is required");

const client = new Steel({ steelAPIKey });
const session = await client.sessions.create({ timeout: 10 * 60 * 1000 });
const cdpUrl = `wss://connect.steel.dev?apiKey=${steelAPIKey}&sessionId=${session.id}`;
const browser = await chromium.connectOverCDP(cdpUrl);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());

try {
  await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
  console.log(await page.title());
} finally {
  await browser.close();
  await client.sessions.release(session.id);
}
```

## Puppeteer

```ts
import puppeteer from "puppeteer-core";

const browser = await puppeteer.connect({ browserWSEndpoint: cdpUrl });
const context = browser.defaultBrowserContext();
const page = (await context.pages())[0] ?? (await context.newPage());
```

## Credentials

Use environment variables for values that may be sensitive:

```ts
await client.credentials.create({
  origin: "https://app.example.com",
  namespace: "example:fred",
  value: {
    username: process.env.APP_USERNAME!,
    password: process.env.APP_PASSWORD!,
    totpSecret: process.env.APP_TOTP_SECRET,
  },
});
```

## Reliability Features

Keep proxy and CAPTCHA snippets minimal here. For mitigation strategy, read `../steel-reliability/references/mitigation-ladder.md` after installing `steel-reliability`.

- Check plan before Steel-managed `useProxy` or `solveCaptcha`.
- Use BYOP via `useProxy: { server: process.env.PROXY_SERVER! }` when the user supplies a proxy.
- Poll CAPTCHA status and handle failures/timeouts explicitly.

## Source Of Truth

- Node SDK/types: https://github.com/steel-dev/steel-node
- API reference: https://steel.apidocumentation.com/api-reference
- Stagehand docs: https://docs.steel.dev/integrations/stagehand
