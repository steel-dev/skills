# testbench — cross-agent skill test harness

Runs each Steel skill's eval prompt through multiple coding agents
(**claude**, **codex**, **opencode**, **pi**) in **headless / non-interactive** mode,
captures each agent's own session transcript, and uses **claude as a judge** to score —
from evidence — whether the agent actually *loaded the skill* and *accomplished the task*.

The point is not just "did it pass" but **does each agent discover and follow the skill** when
given a realistic prompt. A run where the task succeeds but the skill was never loaded is a real
finding (we've already seen it).

## How it works

For every `(agent, task)` pair:

1. **Isolate** — a fresh working dir is created under `runs/<agent>/<task>/<ts>/cwd/`, and the
   skill (plus its manifest `requires` skill-deps) is **copied** into both:
   - `cwd/.claude/skills/<skill>` — read by claude
   - `cwd/.agents/skills/<skill>` — read by codex, opencode, and pi (the shared standard dir)

   Containment is enforced three ways so agents can't escape to the repo root: each `cwd/` is
   `git init`'d (agents that detect their workspace via the nearest `.git` stop there), the
   child's `PWD` is set to `cwd/` (opencode resolves both its workspace **and** its skill
   discovery from `$PWD`, not `getcwd()`), and skills are **copied rather than symlinked** — a
   symlink resolves to the real repo skill dir, so a skill whose scripts write cwd-relative
   output (e.g. `steel-session-debugging`'s `.steel-debug/`) would escape the jail and pollute
   the repo when an agent runs them from the skill dir; a real copy keeps those writes inside
   `cwd/`.
2. **Run** — the agent is launched headlessly in that dir with the eval prompt. Each run is
   wrapped in a timeout and spawned in its own process group (so lingering sandbox helpers get
   reaped). stdin is closed so agents don't block waiting on it.
3. **Capture** — the agent's transcript is collected (stdout JSONL event stream for
   codex/opencode/pi; the on-disk session `.jsonl` for claude) into `transcript.jsonl`.
4. **Judge** — `claude` reads the prompt, the eval's assertions, the transcript, and the files
   created in `cwd/`, and returns a structured verdict (see schema below).
5. **Record** — per-run artifacts land in the run dir; a one-line summary is appended to
   `runs/results.jsonl`.

## Layout

```
testbench/
  config.json            # per-agent model, timeout, command resolution + judge config
  gen-tasks.mjs          # builds tasks.json from each skill's evals/evals.json + manifest.json
  eval-overrides.json    # testbench-local eval fixes merged by task_id (skills are NOT edited)
  tasks.json             # generated; one "smoke" eval per skill (gitignored)
  orchestrate.mjs        # the runner: setup -> run -> capture -> judge -> record
  usage.mjs              # extracts token usage + USD cost from each agent's transcript
  steel-sessions.mjs     # queries Steel API for sessions opened during a run (cost proxy)
  report.mjs             # renders REPORT.md (matrix, rollups, cost/tokens/sessions, run detail)
  judge/
    judge.md             # judge instructions
    judge.schema.json    # verdict shape (skill_loaded, assertions[], task_succeeded, overall, …)
  runs/                  # generated run artifacts (gitignored)
    <agent>/<task>/<ts>/
      prompt.txt  stdout.txt  stderr.txt  transcript.jsonl
      meta.json          # cmd/args (secrets redacted), exit, duration, skill_signal
      judge-prompt.txt  judge-raw.json  verdict.json
    results.jsonl        # one line per (agent, task)
  .env                   # secrets for agents lacking persistent auth (gitignored)
  REPORT.md              # (optional) rendered matrix (gitignored)
```

## Prerequisites & auth

> ⚠️ **Clean global skills first (recommended).** Agents load globally-installed skills
> (`~/.claude/skills`, `~/.agents/skills`, `~/.pi/agent/skills`) *in addition* to the run-dir
> ones. A globally-installed browser/Steel skill (e.g. `agent-browser`, `browser-skill-creator`,
> `amazon-bike-deal-finder`, or another `steel-*`) can trigger alongside or instead of the skill
> under test and contaminate results. Before a clean comparison, remove competing browser/Steel
> skills from those global dirs (`rm -rf ~/.claude/skills/<name> ~/.agents/skills/<name>`).
> They're reinstallable (`npx skills add steel-dev/skills --skill <name>` or `steel init`).

The `steel` CLI must be installed and authed (`steel doctor` should pass) for live runs.
Each agent uses its **own persistent auth** where possible — no ambient env keys required:

| Agent | Headless command | Auth | Default model |
|---|---|---|---|
| claude | `claude -p` (auto-detects `claude-team`) | session / team plan | agent default |
| codex | `codex exec --json` | `~/.codex/auth.json` | agent default |
| opencode | `opencode run --format json` | `~/.local/share/opencode/auth.json` | `zai-coding-plan/glm-5.1` |
| pi | `pi -p --mode json` | **none** — needs a key | `openai/gpt-5.5` |

**pi** has no persistent auth, so the runner passes `--api-key` from an env var
(`OPENAI_API_KEY` for the `openai` provider). Put it in `testbench/.env`:

```
OPENAI_API_KEY=sk-...
```

`orchestrate.mjs` loads `.env` at startup (overriding present-but-empty values), and the key is
**redacted** from logs and `meta.json`. `.env` is gitignored.

## Usage

```bash
# 1. (re)generate tasks.json from the skills' evals
node testbench/gen-tasks.mjs

# 2. run the full smoke matrix (all tasks × their compatible agents)
node testbench/orchestrate.mjs

# 3. or scope a single agent / task
node testbench/orchestrate.mjs --agent claude --task steel-browser__e1
node testbench/orchestrate.mjs --task steel-browser__e1        # one task, all its agents
node testbench/orchestrate.mjs --agent codex                   # one agent, all tasks

# 4. run without judging (capture transcripts only)
node testbench/orchestrate.mjs --agent pi --no-judge

# 5. re-score an existing run without re-running the agent (cheap iteration)
node testbench/orchestrate.mjs --rejudge runs/codex/steel-browser__e1/<ts>
```

Run from anywhere with an absolute path to `orchestrate.mjs` — paths are resolved relative to
the script, not the shell cwd.

## config.json

- `smokeEvalId` — which eval id `gen-tasks.mjs` picks per skill (default `1`).
- `agents.<name>.enabled` — include this agent in matrix runs.
- `agents.<name>.model` — `null` uses the agent's default; otherwise `provider/model`.
- `agents.<name>.timeoutSec` — hard wall-clock cap per run.
- `agents.claude.cmd` / `judge.cmd` — `null` auto-detects `claude-team` (run with
  `--dangerously-skip-permissions`) and falls back to `claude` for portability.

## Tasks

`tasks.json` is generated from each skill's `evals/evals.json` and `manifest.json`:

- one eval per skill (`smokeEvalId`),
- skill `requires` resolved transitively to copyable deps (the non-skill `steel-cli` dep is
  dropped),
- agents filtered to each skill's declared `compatibility` (e.g. `steel-skill-creator` is
  claude-only).

## Eval overrides (skills are never modified)

Source evals live in each skill's `evals/evals.json` (outside `testbench/`). To fix an eval for
testing without touching the skills, add an entry to `eval-overrides.json` keyed by `task_id`;
`gen-tasks.mjs` merges `prompt` / `assertions` / `expected_output` over the source eval. Keys
starting with `_` (e.g. `_reason`) are ignored, and overridden tasks are flagged `overridden` in
`tasks.json`. Current overrides fix two eval-design bugs: a placeholder URL in
`steel-skill-creator` that made the task unrunnable, and a `steel-browser` assertion that demanded
a field literally named `text` when the prompt only asked for "authors and tags".

## Cost & tokens

`usage.mjs` pulls per-run token counts and USD cost from each agent's output:
`claude` reports `total_cost_usd` + usage; `opencode` and `pi` report per-step/per-message cost;
`codex` reports tokens only (team plan, no per-call cost). `report.mjs` adds a per-agent rollup,
a per-run cost/token matrix, and cost in the run detail. Note: agents that **install globally by
design** (e.g. `steel-skill-creator` writes to `~/.agents/skills`) escape the per-run `cwd`
containment — that's inherent to what the skill does, not a harness leak.

### Steel sessions (a direct cost proxy)

`steel-sessions.mjs` queries the Steel API (`GET /v1/sessions`, key from
`~/.config/steel/config.json`) for sessions created within each run's time window and records
the count plus total `duration`/`creditsUsed`/`proxyBytesUsed` in `meta.steel_sessions`. The
report shows sessions started + session-seconds per run and per agent. Caveats: attribution
assumes **sequential** runs (it does) and that no other Steel activity overlaps the window;
`duration`/`credits` are read right after the run, so a session not yet finalized may report `0`
(the **count** is always reliable). Only runs executed after this feature landed populate it —
re-run a task/matrix to fill the column.

## Judge & verdict

The judge is `claude` run with `--output-format json`. The verdict JSON is enforced via the
prompt (schema embedded) and extracted from the result. Verdict fields:

- `skill_loaded` (+ `skill_load_evidence`) — did the agent actually read/invoke the skill, vs.
  just doing the task its own way?
- `assertions[]` — `pass | fail | unclear` per eval assertion, each with evidence.
- `task_succeeded` — did the real end goal happen (valid output files, not just a confident
  message)?
- `overall` — `pass | partial | fail`.
- `summary` — short rationale.

`meta.json.skill_signal` is a cheap non-LLM heuristic (does the transcript reference the skill
path / name?) used as a hint; the judge's `skill_loaded` is the authoritative call.

## Agent-specific notes (observed on this machine)

- **claude-team**: `--bare` disables team-plan auth ("Not logged in") and `--json-schema` emits
  zero bytes — so the harness avoids both and enforces JSON via the prompt instead.
- **codex** `exec`: no `--ask-for-approval` flag; uses `-s danger-full-access` (network is needed
  for live Steel). Can be slow on hard tasks; a finished run may leave a subprocess holding the
  stdout pipe — handled by process-group kill on `exit`.
- **opencode**: has a native `skill` tool, but the model must choose to use it — a capable model
  can finish the task without ever loading the skill.
- **pi**: no `Skill` tool — the model reads `SKILL.md` directly; needs an explicit `--api-key`.

## Known caveats

- Live runs hit the real web + Steel cloud and cost usage; they are subject to site flakiness.
- Write isolation is enforced via per-run `git init` + `PWD` + copied (not symlinked) skills (see
  the pipeline above). If you add an agent, re-verify it writes only inside `cwd/` and discovers
  skills from the run dir.
- Transcript shapes differ per agent; the judge is written to adapt across them.
