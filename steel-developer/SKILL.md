---
name: steel-developer
description: Use this skill when the user wants reusable code, scripts, examples, or docs that build on Steel cloud browsers with SDKs, REST APIs, Playwright, Puppeteer, Stagehand, Browser Use, credentials, profiles, files, extensions, embeds, proxies, or CAPTCHA APIs. Do not use for live web browsing performed by the agent; use steel-browser. Route failed-session diagnosis to steel-session-debugging and reliability mitigation to steel-reliability.
license: MIT
compatibility: claude-code,codex,cursor,opencode,pi
metadata:
  owner: steel
  category: build
  stage: ga
---

# Steel Developer

## Skill Boundary

- Use this skill when the user wants code or implementation guidance they will run later.
- Do not use this skill when the user wants the agent to browse, extract, screenshot, create a PDF, or fill a form now; use `steel-browser`.
- Use `steel-session-debugging` when the main task is diagnosing a failed session.
- Use `steel-reliability` when the main task is bot detection, proxy, CAPTCHA, identity, pacing, or login reliability mitigation.

## Route By Need

Load the relevant reference before writing code:

- CLI setup and local verification: `references/cli-setup.md`
- TypeScript, JavaScript, Node.js, Playwright, Puppeteer, Stagehand: `references/typescript.md`
- Python, Playwright Python, Browser Use: `references/python.md`
- First-party APIs, exact docs/API/SDK lookup, browser tools, files, extensions, auth context, embeds, traces, mobile mode, multi-region: `references/apis.md`
- Framework choice, Stagehand, Browser Use, typed agent frameworks, coding-agent integrations: `references/ecosystem.md`
- Stale SDK/API patterns to avoid: `references/anti-patterns.md`
- Computer-use loops: `references/computer-use.md`
- Live and past session embeds: `references/live-embed.md`
- Reliability boundary and handoff: `references/reliability-handoff.md`

## Non-Negotiables

- Auth env var is `STEEL_API_KEY`.
- Node examples import `Steel` from `steel-sdk`; SDK source is `steel-dev/steel-node`.
- Node SDK constructor uses `steelAPIKey`.
- Python SDK constructor uses `steel_api_key`.
- Always release sessions in cleanup.
- Construct the CDP URL explicitly as `wss://connect.steel.dev?apiKey=...&sessionId=...`.
- Reuse the default browser context after connecting; do not create a new context unless the user explicitly needs isolation.
- Keep target-site credentials out of prompts, code comments, page scripts, and logs.
- For exact API fields or SDK method signatures, inspect the API reference, SDK docs, local installed types, or Steel docs via `curl -sSfL`.
- Never use stale patterns listed in `references/anti-patterns.md`.

## Minimal Session Shape

TypeScript:

```ts
const steelAPIKey = process.env.STEEL_API_KEY;
if (!steelAPIKey) throw new Error("STEEL_API_KEY is required");

const client = new Steel({ steelAPIKey });
const session = await client.sessions.create();
const cdpUrl = `wss://connect.steel.dev?apiKey=${steelAPIKey}&sessionId=${session.id}`;
const browser = await chromium.connectOverCDP(cdpUrl);
const context = browser.contexts()[0];
const page = context.pages()[0] ?? (await context.newPage());

try {
  await page.goto("https://example.com");
} finally {
  await browser.close();
  await client.sessions.release(session.id);
}
```

Python:

```python
steel_api_key = os.environ["STEEL_API_KEY"]
client = Steel(steel_api_key=steel_api_key)
session = client.sessions.create()
cdp_url = f"wss://connect.steel.dev?apiKey={steel_api_key}&sessionId={session.id}"
browser = await playwright.chromium.connect_over_cdp(cdp_url)
context = browser.contexts[0]
page = context.pages[0] if context.pages else await context.new_page()
try:
    await page.goto("https://example.com")
finally:
    await browser.close()
    await playwright.stop()
    client.sessions.release(session.id)
```

## Setup Verification

```bash
steel --version
steel login
steel doctor --preflight
steel skills doctor
```

## Source-Of-Truth Links

- API reference: https://steel.apidocumentation.com/api-reference
- Node SDK/types: https://github.com/steel-dev/steel-node
- Python SDK/types: https://github.com/steel-dev/steel-python
- Docs index: `curl -sSfL https://docs.steel.dev/llms.txt`
- Full docs bundle: `curl -sSfL https://docs.steel.dev/llms-full.txt`
- Single docs page: `curl -sSfL https://docs.steel.dev/llms.mdx/<page-path>`
