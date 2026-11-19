# Steel Ecosystem

Use direct Playwright or Puppeteer as the deterministic baseline unless a higher-level framework clearly matches the user's goal.

## Routing

| User goal | Recommended route |
| --- | --- |
| Deterministic browser script | Playwright or Puppeteer |
| Natural-language TypeScript browser actions | Stagehand |
| Python LLM browser agent loop | Browser Use |
| Model-native screenshot/action loop | Computer-use integrations |
| Typed tool/agent product | Vercel AI SDK, OpenAI Agents SDK, Mastra, AgentKit, LangGraph, Pydantic AI, Agno, or CrewAI |
| Coding agent should operate browser now | `steel-browser` |

Ignore Selenium unless the user explicitly asks for it.

## Baseline Rules

- Create a Steel session in application code.
- Construct `wss://connect.steel.dev?apiKey=...&sessionId=...` explicitly.
- Connect over CDP.
- Reuse the default context and page.
- Release the Steel session in cleanup.
- Add profiles, credentials, files, extensions, proxies, and CAPTCHA handling only as needed.

## Links

- Integrations index: https://steel.dev/docs/integrations
- Cookbook index: https://steel.dev/docs/examples
- Stagehand: https://steel.dev/docs/integrations/stagehand
- Browser Use: https://steel.dev/docs/integrations/browser-use
- Playwright: https://steel.dev/docs/integrations/playwright
- Puppeteer: https://steel.dev/docs/integrations/puppeteer
