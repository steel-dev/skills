# Steel Skills

Official agent skills for using Steel cloud browsers.

## Install

Install the Steel CLI using the [official installer](https://setup.steel.dev):

```bash
curl -fsS https://setup.steel.dev | sh -s -- --agent
```

Install skills in the environment where the agent's tools run. A local
installation is not automatically available to a remote or containerized agent.
Follow the installer's prerequisite and authorization prompts; report any
unfinished steps rather than treating installation alone as ready to browse.

List available skills:

```bash
npx skills add steel-dev/skills --list
```

Install a specific skill:

```bash
npx skills add steel-dev/skills --skill steel-browser
npx skills add steel-dev/skills --skill steel-developer
npx skills add steel-dev/skills --skill steel-session-debugging
npx skills add steel-dev/skills --skill steel-reliability
npx skills add steel-dev/skills --skill steel-skill-creator
```

Install for a specific agent:

```bash
npx skills add steel-dev/skills --skill steel-browser -a claude-code -g
```

## First use

Confirm that your client can load `steel-browser`, then check the CLI:

```bash
steel --version
steel doctor --preflight
```

If `steel` is not on PATH, use the executable path reported by the installer
(typically `"$HOME/.steel/bin/steel"`) in each tool call. Shell environment changes
may not persist between calls; reinstalling a different CLI package is not a PATH fix.

Follow the installed CLI's supported authentication flow without sharing
credentials in chat. Successful diagnostics establish API access, not completion
of a browsing task. Use default session settings unless the task requires an
account-supported override, and stop any interactive sessions created for the task.

## Skills

| Skill                     | Use when                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `steel-browser`           | The agent should operate a real Steel browser now.                                              |
| `steel-developer`         | The agent should write reusable code that runs on Steel.                                        |
| `steel-session-debugging` | The agent should diagnose a failed Steel session from logs, traces, and replay evidence.        |
| `steel-reliability`       | The agent should diagnose bot-detection, CAPTCHA, proxy, identity, or login reliability issues. |
| `steel-skill-creator`     | The agent should turn a repeated browser task into a reusable skill.                            |

## Which skill should I use?

- Use `steel-browser` for one-off live web work.
- Use `steel-developer` for reusable Steel code, apps, scripts, and docs.
- Use `steel-session-debugging` when a session failed and you need evidence-backed diagnosis.
- Use `steel-reliability` when the evidence points to bot detection, CAPTCHA, proxies, profiles, credentials, pacing, or login reliability.
- Use `steel-skill-creator` to turn a recurring browser workflow into a new skill.

## Metadata

`manifest.json` contains display metadata for docs, CLI helpers, and launch tracking. Skill discovery and agent-specific installation are handled by the open `npx skills` installer.

## Development

Validate the catalog:

```bash
node scripts/validate-skills.mjs
```
