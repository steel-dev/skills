# Steel APIs

Use this file to choose the right Steel API and avoid common implementation mistakes. Use the API reference and SDK types for exact request fields and method signatures.

## Source Of Truth

- API reference: https://steel.apidocumentation.com/api-reference
- Sessions create endpoint: https://steel.apidocumentation.com/api-reference#tag/sessions/post/v1/sessions
- Node SDK: https://github.com/steel-dev/steel-node
- Python SDK: https://github.com/steel-dev/steel-python

Fetch docs with redirects:

```bash
curl -sSfL https://docs.steel.dev/llms.txt
curl -sSfL https://docs.steel.dev/llms-full.txt
curl -sSfL https://docs.steel.dev/llms.mdx/overview/sessions-api/quickstart
```

## Routing

| Need | Use |
| --- | --- |
| Create and release browser sessions | Sessions API |
| Connect Playwright or Puppeteer | Sessions API plus explicit CDP URL |
| One-shot scrape, screenshot, or PDF | Browser Tools |
| Persist full browser state | Profiles API |
| Reuse cookies/localStorage once | Session context |
| Secure login injection | Credentials API |
| CAPTCHA status and solving | CAPTCHAs API |
| Steel-managed or BYOP proxying | Session `useProxy` |
| Upload/download files | Files API |
| Add Chrome extensions | Extensions API |
| Embed live or past viewers | Session embeds |
| Review activity timelines | Agent traces |

## Gotchas

- Browser Tools are stateless; use sessions for multi-step state.
- Release sessions in cleanup.
- Capture `sessionContext` before releasing the source session.
- Treat session context, credentials, logs, traces, and screenshots as sensitive.
- Extensions are organization-scoped and initialize at session start.
- Files must be uploaded or mounted into the Steel session before browser code can access them.

For operational CAPTCHA/proxy diagnosis, use `steel-reliability`. For post-run log/trace diagnosis, use `steel-session-debugging`.
