# Computer Use

Keep computer-use guidance inside `steel-developer` at launch.

Use computer-use integrations when the model should reason from screenshots and emit low-level actions instead of relying on DOM selectors.

## Pattern

1. Create a Steel session with appropriate dimensions or mobile mode.
2. Capture screenshots or live frame data.
3. Send screenshots to the model.
4. Convert model actions into Steel computer/session input APIs.
5. Preserve session IDs and viewer URLs for debugging.
6. Release sessions in cleanup.

## Gotchas

- Prefer DOM-based Playwright/Puppeteer for deterministic workflows.
- Use computer use when the UI is visual, canvas-heavy, or selector-hostile.
- Keep credentials and screenshots private.
- Route failed runs to `steel-session-debugging`.

## References

- Claude Computer Use: https://docs.steel.dev/integrations/claude-computer-use
- OpenAI Computer Use: https://docs.steel.dev/integrations/openai-computer-use
- Gemini Computer Use: https://docs.steel.dev/integrations/gemini-computer-use
