# CLI Setup

Steel application code should lean on the CLI for local auth and smoke testing.

```bash
steel --version
steel login
steel doctor --preflight
steel skills doctor
steel scrape https://example.com
```

Use `STEEL_API_KEY` in generated code. If the user is already logged in through the CLI but code needs an environment variable, explain how to export or configure a key rather than asking them to paste secrets into chat.

When the task is project setup, verify the CLI path before writing SDK code. When the task is only code generation, still include a note that `steel doctor --preflight` should pass before running.
