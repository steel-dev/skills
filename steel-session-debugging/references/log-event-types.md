# Log Event Types

## Session Metadata

Use `steel --json sessions get <session-id>` for lifecycle status, creation time, URLs, region, profile, proxy status, and release/failure state.

## Browser Logs

Use `steel --json sessions logs <session-id>` for page and browser events. Look for:

- console errors
- navigation errors
- failed requests
- page crashes
- timeout markers
- CAPTCHA/proxy events

## Raw Agent Logs

Use `steel --json sessions agent-logs <session-id>` for CDP-derived event streams. Raw logs are useful when the semantic trace is incomplete or when you need exact low-level timing.

## Agent Traces

Use `steel --json sessions traces <session-id>` for semantic actions such as clicks, fills, navigations, waits, extracted text, accessible names, selectors, and result summaries.

## How To Separate Them

- Metadata answers "what session was this?"
- Browser logs answer "what did the page/browser report?"
- Raw agent logs answer "what low-level events occurred?"
- Agent traces answer "what did the agent intend and do?"

Never blend them into one vague "logs say" claim. Name the surface that provides the evidence.
