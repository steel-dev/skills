# Python

Use this file for Python, Playwright Python, Browser Use, and Python browser-agent tasks.

## Install

```bash
pip install steel-sdk playwright
```

Use `STEEL_API_KEY` from the environment. Do not hardcode API keys or target-site credentials.

## Playwright

```python
import os
from steel import Steel
from playwright.async_api import async_playwright

steel_api_key = os.environ["STEEL_API_KEY"]
client = Steel(steel_api_key=steel_api_key)
session = client.sessions.create()
cdp_url = f"wss://connect.steel.dev?apiKey={steel_api_key}&sessionId={session.id}"

playwright = await async_playwright().start()
browser = await playwright.chromium.connect_over_cdp(cdp_url)
context = browser.contexts[0]
page = context.pages[0] if context.pages else await context.new_page()

try:
    await page.goto("https://example.com", wait_until="domcontentloaded")
    print(await page.title())
finally:
    await browser.close()
    await playwright.stop()
    client.sessions.release(session.id)
```

Puppeteer is not the Python path. Use Playwright for deterministic browser control or Browser Use for an agent loop.

## Browser Use

```python
from browser_use import Agent, BrowserSession

agent = Agent(
    task="Find the latest news on Steel.dev",
    llm=llm,
    browser_session=BrowserSession(cdp_url=cdp_url),
)

result = await agent.run()
```

Expose CAPTCHA status helpers as Browser Use tools only when the flow needs them.

## Reliability Features

Keep proxy and CAPTCHA snippets minimal here. For mitigation strategy, read `../steel-reliability/references/mitigation-ladder.md` after installing `steel-reliability`.

- Check plan before Steel-managed `use_proxy` or `solve_captcha`.
- Use BYOP via `use_proxy={"server": os.environ["PROXY_SERVER"]}` when the user supplies a proxy.
- Poll CAPTCHA status and handle failures/timeouts explicitly.

## Source Of Truth

- Python SDK/types: https://github.com/steel-dev/steel-python
- API reference: https://steel.apidocumentation.com/api-reference
- Browser Use docs: https://docs.steel.dev/integrations/browser-use
