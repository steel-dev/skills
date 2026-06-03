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
   skill (plus its manifest `requires` skill-deps) is symlinked into both:
   - `cwd/.claude/skills/<skill>` — read by claude
   - `cwd/.agents/skills/<skill>` — read by codex, opencode, and pi (the shared standard dir)
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
  tasks.json             # generated; one "smoke" eval per skill (gitignored)
  orchestrate.mjs        # the runner: setup -> run -> capture -> judge -> record
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
- skill `requires` resolved transitively to symlinkable deps (the non-skill `steel-cli` dep is
  dropped),
- agents filtered to each skill's declared `compatibility` (e.g. `steel-skill-creator` is
  claude-only).

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
- An agent may write outside its isolated `cwd/` if it changes directories — verify isolation
  before trusting "no side effects".
- Transcript shapes differ per agent; the judge is written to adapt across them.
