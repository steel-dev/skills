# Steel Browser Skill

Operate live Steel browsers with stable CLI v0.5.0 or later. The skill works with
coding agents that can run shell commands and read files; native skill discovery
is optional.

## Install and load

For CLI installation and device authorization, follow
[setup.steel.dev/install.md](https://setup.steel.dev/install.md).

Install only this skill from a project:

```bash
npx skills add steel-dev/skills --skill steel-browser -a universal -y
```

Or use the installed CLI:

```bash
steel skills install steel-browser --agent universal --yes
```

Read `.agents/skills/steel-browser/SKILL.md` or load it through the client's
native skill mechanism. The complete directory includes the references needed
for future tasks. Installation alone does not prove skill loading or task success.

## What belongs here

- Choose scrape/screenshot/PDF for one-shot work, or a named session for interaction.
- Navigate, snapshot, and act through the HTTP Commands API.
- Click and retrieve browser downloads, inspect saved artifacts, and recover
  from timeouts without creating duplicate exports.
- Share the live viewer for a task the user wants to watch.
- Diagnose installation, authorization, endpoint, or session failures; install
  and load specialist debugging/reliability skills when needed.
- Verify the result and stop only the task-owned session, including failure paths.

The setup guide stays short; these workflows and references are the durable
instructions agents should use after setup. No local daemon or `agent-browser`
installation is required. For inaccessible private-network/localhost targets,
choose an appropriate local environment rather than assuming cloud reachability.

## References and validation

`SKILL.md` points to focused command, lifecycle, download, live-viewing,
troubleshooting, migration, and resource references. Existing cases remain in
`evals/evals.json`; additional cases live in named folders under `evals/`.

From the repository root:

```bash
node scripts/validate-skills.mjs
python3 scripts/check-browser-examples.py --binary /path/to/steel
```

The example check appends `--help` to executable command examples in an isolated
configuration. It checks command/flag compatibility, not live API behavior. CI
uses the checksum-verified published Linux x86_64 v0.5.0 artifact.
