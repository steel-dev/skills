// ABOUTME: Runs skill eval prompts through claude/codex/opencode/pi headlessly in isolated dirs.
// ABOUTME: Captures each agent's transcript, then (optionally) judges the result with claude.

import { spawn, execFileSync } from "node:child_process";
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, copyFileSync, readdirSync, statSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { extractUsage } from "./usage.mjs";
import { fetchSteelSessions } from "./steel-sessions.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const HOME = homedir();

const config = JSON.parse(readFileSync(join(here, "config.json"), "utf8"));
const tasksDoc = JSON.parse(readFileSync(join(here, "tasks.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(repoRoot, "manifest.json"), "utf8"));

// Load testbench/.env (KEY=VALUE) into process.env without overwriting existing values.
function loadDotenv() {
  const envFile = join(here, ".env");
  if (!existsSync(envFile)) return;
  for (const raw of readFileSync(envFile, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    // Override missing OR empty existing values (direnv/pass can leave keys present-but-empty).
    if (!process.env[key]) process.env[key] = val;
  }
}
loadDotenv();

// Resolve the claude binary: prefer `claude-team` (team plan) if on PATH, else `claude`.
// `claude-team` is run with --dangerously-skip-permissions for unattended use.
function whichSync(name) {
  for (const dir of (process.env.PATH || "").split(":")) {
    if (dir && existsSync(join(dir, name))) return join(dir, name);
  }
  return null;
}
function resolveClaude(override) {
  if (override) return { cmd: override, skip: /team/.test(override) };
  if (whichSync("claude-team")) return { cmd: "claude-team", skip: true };
  return { cmd: "claude", skip: false };
}

// ---- CLI args -------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, def = null) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : def;
};
const flag = (name) => argv.includes(`--${name}`);
const onlyAgent = opt("agent");
const onlyTask = opt("task");
const noJudge = flag("no-judge");
const noSeed = flag("no-seed"); // skip seeding even if a selected task consumes the fixture
const rejudgeDir = opt("rejudge"); // path to an existing run dir; re-runs only the judge

// ---- fixtures (real seeded session shared by the chain) -------------------
const fixturesPath = join(here, "runs", "_fixtures.json");
const loadFixtures = () => (existsSync(fixturesPath) ? JSON.parse(readFileSync(fixturesPath, "utf8")) : {});
let fixtures = loadFixtures();

// Replace {{session_id}} (and any future {{token}}) in a task's prompt/assertions/expected_output
// with the real seeded value. Throws if a token is present but the fixture is missing — running a
// fixture-consuming task against a literal "{{session_id}}" would be a silent false failure.
function resolveTask(task) {
  const subst = (s) => String(s).replace(/\{\{(\w+)\}\}/g, (m, key) => {
    const v = fixtures[key];
    if (v == null) throw new Error(`task ${task.task_id} needs fixture "${key}" but it is missing — seed first (run without --no-seed)`);
    return v;
  });
  return {
    ...task,
    prompt: subst(task.prompt),
    expected_output: task.expected_output ? subst(task.expected_output) : task.expected_output,
    assertions: (task.assertions || []).map(subst),
  };
}

// Produce the shared fixture session by running the committed seed CLI. Synchronous + fail-fast:
// a broken seed must abort the matrix rather than let every consumer false-fail.
function runSeed() {
  console.log("\n● seeding shared fixture session (seed/seed-session.mjs)");
  execFileSync(process.execPath, [join(here, "seed", "seed-session.mjs")], { stdio: "inherit" });
  fixtures = loadFixtures();
  if (!fixtures.session_id) throw new Error("seed completed but runs/_fixtures.json has no session_id");
}

// ---- helpers --------------------------------------------------------------
const ts = () => new Date().toISOString().replace(/[:.]/g, "-");

// Mask secret values (e.g. the arg after --api-key) for logging and on-disk meta.
function redactArgs(args) {
  return args.map((a, i) => (args[i - 1] === "--api-key" ? "***REDACTED***" : a));
}
const claudeProjectKey = (absDir) => absDir.replace(/[^a-zA-Z0-9]/g, "-");

function skillPathFor(skillName, task) {
  if (skillName === task.skill && task.skill_path) return task.skill_path;
  return manifest.skills?.[skillName]?.path ?? skillName;
}

function copySkillInto(skillsDir, skillName, task) {
  const skillPath = join(repoRoot, skillPathFor(skillName, task));
  if (!existsSync(skillPath)) throw new Error(`skill folder missing: ${skillPath}`);
  mkdirSync(skillsDir, { recursive: true });
  const dest = join(skillsDir, skillName);
  // Copy (not symlink) the skill tree into cwd. A symlink resolves to the real repo skill dir,
  // so a skill whose scripts write cwd-relative output (e.g. steel-session-debugging's
  // `.steel-debug/`) escapes the git-init jail and pollutes the repo when an agent runs them
  // from the skill dir. A real copy keeps every such write inside cwd. Skills are tiny (<128K).
  if (!existsSync(dest)) cpSync(skillPath, dest, { recursive: true });
}

function setupRunDir(agent, task) {
  const runDir = join(here, "runs", agent, task.task_id, ts());
  const cwd = join(runDir, "cwd");
  mkdirSync(cwd, { recursive: true });
  // Make cwd a self-contained project root. Agents (opencode, claude, codex, pi) detect their
  // workspace by walking up to the nearest .git; without this they escape to the repo root and
  // write there. A local .git stops the upward walk and contains all file writes to cwd.
  try { execFileSync("git", ["init", "-q"], { cwd }); } catch { /* git missing — best effort */ }
  // Claude reads .claude/skills; codex/opencode/pi read .agents/skills.
  const claudeSkills = join(cwd, ".claude", "skills");
  const agentsSkills = join(cwd, ".agents", "skills");
  const names = [task.skill, ...task.deps];
  for (const n of names) {
    copySkillInto(claudeSkills, n, task);
    copySkillInto(agentsSkills, n, task);
  }
  writeFileSync(join(runDir, "prompt.txt"), task.prompt + "\n");
  return { runDir, cwd };
}

function run(cmd, args, { cwd, timeoutSec }) {
  return new Promise((res) => {
    const started = Date.now();
    // detached:true puts the agent in its own process group so we can kill any lingering
    // grandchildren (e.g. codex sandbox helpers that hold the stdout pipe open) on timeout.
    const child = spawn(cmd, args, {
      cwd,
      // Override PWD to the run dir: some agents (opencode) resolve their workspace from $PWD
      // rather than getcwd(), and would otherwise escape to the inherited repo-root PWD.
      env: { ...process.env, PWD: cwd },
      stdio: ["ignore", "pipe", "pipe"], // close stdin so agents don't block waiting on it
      detached: true,
    });
    let stdout = "", stderr = "", timedOut = false, done = false;
    const killGroup = () => { try { process.kill(-child.pid, "SIGKILL"); } catch { try { child.kill("SIGKILL"); } catch { /* gone */ } } };
    const timer = setTimeout(() => { timedOut = true; killGroup(); }, timeoutSec * 1000);
    const finish = (extra) => {
      if (done) return; done = true; clearTimeout(timer);
      res({ stdout, stderr, ms: Date.now() - started, timedOut, ...extra });
    };
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (e) => finish({ code: -1, stderr: stderr + `\n[spawn error] ${e.message}` }));
    // 'exit' fires when the agent process itself exits; resolve then even if a stray child
    // keeps a pipe open. Give stdio a brief grace period to flush first via 'close'.
    let exited = null;
    child.on("exit", (code, signal) => { exited = { code: code ?? -1, signal }; setTimeout(() => { killGroup(); finish(exited); }, 1500); });
    child.on("close", (code, signal) => finish(exited ?? { code: code ?? -1, signal }));
  });
}

function newestFileUnder(dir, predicate, sinceMs) {
  if (!existsSync(dir)) return null;
  let best = null, bestM = 0;
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (predicate(p)) {
        const m = statSync(p).mtimeMs;
        if (m >= (sinceMs ?? 0) && m > bestM) { best = p; bestM = m; }
      }
    }
  };
  walk(dir);
  return best;
}

// ---- per-agent runners ----------------------------------------------------
// Each returns { argvDisplay, transcriptFrom, locate(stdout, runDir, cwd, startMs) -> transcriptPath|null }
const RUNNERS = {
  claude(task, { cwd, model, timeoutSec }) {
    const { cmd, skip } = resolveClaude(config.agents.claude.cmd);
    const args = skip ? ["--dangerously-skip-permissions"] : [];
    args.push("-p", task.prompt, "--output-format", "json");
    if (!skip) args.push("--allowedTools", "Bash Read Write Edit Glob Grep WebFetch", "--permission-mode", "acceptEdits");
    if (model) args.push("--model", model);
    return {
      cmd, args, cwd, timeoutSec,
      // claude writes a single JSON object to stdout; transcript is on disk keyed by session_id
      locate: (stdout) => {
        let sid = null;
        try { sid = JSON.parse(stdout).session_id; } catch { /* fall through to mtime */ }
        const projDir = join(HOME, ".claude", "projects", claudeProjectKey(cwd));
        if (sid) {
          const p = join(projDir, `${sid}.jsonl`);
          if (existsSync(p)) return p;
        }
        return newestFileUnder(projDir, (p) => p.endsWith(".jsonl"), 0);
      },
    };
  },
  codex(task, { cwd, model, timeoutSec }) {
    const args = ["exec", "--cd", cwd, "--skip-git-repo-check",
      "--sandbox", "danger-full-access", "--json"];
    if (model) args.push("-m", model);
    args.push(task.prompt);
    return { cmd: "codex", args, cwd, timeoutSec, stdoutIsTranscript: true };
  },
  opencode(task, { cwd, model, timeoutSec }) {
    const args = ["run", "--format", "json", "--dangerously-skip-permissions"];
    if (model) args.push("-m", model);
    args.push(task.prompt);
    return { cmd: "opencode", args, cwd, timeoutSec, stdoutIsTranscript: true };
  },
  pi(task, { cwd, model, timeoutSec }) {
    const sessionDir = join(cwd, ".pi-session");
    mkdirSync(sessionDir, { recursive: true });
    const args = ["-p", "--mode", "json", "--session-dir", sessionDir];
    if (model) {
      const [provider, ...rest] = model.split("/");
      args.push("--provider", provider, "--model", rest.join("/") || provider);
      // pi has no persistent auth here; supply the key explicitly per provider.
      const KEY_BY_PROVIDER = { openai: "OPENAI_API_KEY", google: "GEMINI_API_KEY", anthropic: "ANTHROPIC_API_KEY", zai: "ZAI_API_KEY" };
      const key = process.env[KEY_BY_PROVIDER[provider] || ""];
      if (key) args.push("--api-key", key);
    }
    args.push(task.prompt);
    return {
      cmd: "pi", args, cwd, timeoutSec, stdoutIsTranscript: true,
      locate: () => newestFileUnder(sessionDir, (p) => p.endsWith(".jsonl"), 0),
    };
  },
};

// ---- skill-load heuristic (judge confirms) --------------------------------
function detectSkillSignal(text, task) {
  if (!text) return { loaded: false, evidence: "no transcript text" };
  const needles = [
    `${task.skill}/SKILL.md`,
    `skills/${task.skill}`,
    `.agents/skills/${task.skill}`,
    `.claude/skills/${task.skill}`,
    `"name":"${task.skill}"`,
    `"name": "${task.skill}"`,
  ];
  for (const n of needles) if (text.includes(n)) return { loaded: true, evidence: `matched "${n}"` };
  return { loaded: false, evidence: "no skill path/name reference found" };
}

function transcriptExcerpt(text) {
  const max = 120000;
  if (text.length <= max) return { text, note: "full transcript" };
  const headLen = 40000;
  const tailLen = max - headLen;
  return {
    text: [
      text.slice(0, headLen),
      `\n\n[... omitted ${text.length - max} chars from middle of transcript ...]\n\n`,
      text.slice(-tailLen),
    ].join(""),
    note: `head ${headLen} chars + tail ${tailLen} chars; middle omitted`,
  };
}

// ---- judge ----------------------------------------------------------------
function listOutputFiles(cwd) {
  const skip = new Set([".claude", ".agents", ".opencode", ".pi", ".pi-session"]);
  const out = [];
  const walk = (d, depth) => {
    if (depth > 3) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else { const st = statSync(p); out.push({ path: relative(cwd, p), bytes: st.size }); }
    }
  };
  walk(cwd, 0);
  return out;
}

// Skills whose generated code the harness should actually execute to verify it works (not just
// judge the source). steel-developer asks for a runnable Steel+Playwright script.
const EXEC_SKILLS = new Set(["steel-developer"]);
const STEEL_TITLE_MARKER = "Example Domain"; // example.com's <title>, what the dev script must print

function steelApiKey() {
  try { return JSON.parse(readFileSync(join(HOME, ".config", "steel", "config.json"), "utf8")).apiKey || null; }
  catch { return null; }
}

// Find the runnable entry the agent produced: a .ts/.js/.mjs file that imports steel-sdk or builds a
// CDP connection. Newest match wins (agents sometimes leave scratch files).
function findGeneratedScript(cwd) {
  const exts = new Set([".ts", ".mts", ".cts", ".tsx", ".js", ".mjs", ".cjs", ".jsx"]);
  let best = null, bestM = 0;
  for (const f of listOutputFiles(cwd)) {
    if (f.path.startsWith("node_modules/") || !exts.has(f.path.slice(f.path.lastIndexOf(".")))) continue;
    let src = "";
    try { src = readFileSync(join(cwd, f.path), "utf8"); } catch { continue; }
    if (!/steel-sdk|connectOverCDP|sessions\.create/.test(src)) continue;
    const m = statSync(join(cwd, f.path)).mtimeMs;
    if (m > bestM) { best = f.path; bestM = m; }
  }
  return best;
}

// Run the agent's generated script with tsx against a real Steel session. Resolved from the run cwd,
// it picks up steel-sdk/playwright/tsx from testbench/node_modules via upward module resolution.
async function execGeneratedScript(cwd, runDir, timeoutSec) {
  const file = findGeneratedScript(cwd);
  if (!file) return { ran: false, reason: "no runnable Steel script found in cwd" };
  const key = steelApiKey();
  if (!key) return { ran: false, file, reason: "no Steel API key (cannot execute)" };
  const tsx = join(here, "node_modules", ".bin", "tsx");
  if (!existsSync(tsx)) return { ran: false, file, reason: "tsx not installed (run npm install in testbench/)" };
  // run() forwards process.env to the child; the generated script reads STEEL_API_KEY from it.
  process.env.STEEL_API_KEY = key;
  const r = await run(tsx, [file], { cwd, timeoutSec });
  writeFileSync(join(runDir, "exec-stdout.txt"), r.stdout || "");
  writeFileSync(join(runDir, "exec-stderr.txt"), r.stderr || "");
  const printedTitle = (r.stdout || "").includes(STEEL_TITLE_MARKER);
  return {
    ran: true, file, exit_code: r.code, timed_out: !!r.timedOut, duration_ms: r.ms,
    printed_expected_title: printedTitle,
    stdout_tail: (r.stdout || "").slice(-1500), stderr_tail: (r.stderr || "").slice(-1500),
  };
}

// Extract the verdict object from claude's `--output-format json` envelope (.result holds the
// model's text). Tolerates code fences and surrounding prose by slicing the outermost braces.
function parseVerdict(stdout) {
  if (!stdout || !stdout.trim()) return { error: "judge produced no output" };
  let resultText = stdout;
  try {
    const outer = JSON.parse(stdout);
    if (outer.structured_output) return outer.structured_output;
    if (typeof outer.result === "string") resultText = outer.result;
  } catch { /* stdout may itself be the bare JSON */ }
  try { return JSON.parse(resultText); } catch { /* fall through to brace slice */ }
  const i = resultText.indexOf("{"), j = resultText.lastIndexOf("}");
  if (i >= 0 && j > i) {
    try { return JSON.parse(resultText.slice(i, j + 1)); } catch (e) {
      return { error: "judge JSON parse failed", detail: e.message, raw: resultText.slice(0, 500) };
    }
  }
  return { error: "no JSON object in judge result", raw: resultText.slice(0, 500) };
}

// The judge occasionally omits `overall` (no --json-schema enforcement in this build). Derive it
// from the structured fields so the matrix never shows "?". Marks overall_derived for transparency.
function normalizeVerdict(v) {
  if (!v || v.error) return v;
  if (!["pass", "partial", "fail"].includes(v.overall)) {
    const a = Array.isArray(v.assertions) ? v.assertions : [];
    const fails = a.filter((x) => x.verdict === "fail").length;
    const passes = a.filter((x) => x.verdict === "pass").length;
    if (v.skill_loaded === true && v.task_succeeded === true && fails === 0) v.overall = "pass";
    else if (v.task_succeeded === true || v.skill_loaded === true || passes > 0) v.overall = "partial";
    else v.overall = "fail";
    v.overall_derived = true;
  }
  return v;
}

async function judge(task, agent, runDir, cwd, transcriptText, skillSignal, devExec = null) {
  const files = listOutputFiles(cwd);
  const filePreviews = files.slice(0, 12).map((f) => {
    let head = "";
    try { head = readFileSync(join(cwd, f.path), "utf8").slice(0, 1500); } catch { /* binary */ }
    return `--- ${f.path} (${f.bytes}b) ---\n${head}`;
  }).join("\n\n");
  const schema = readFileSync(join(here, "judge", "judge.schema.json"), "utf8");
  const instructions = readFileSync(join(here, "judge", "judge.md"), "utf8");
  const excerpt = transcriptExcerpt(transcriptText);
  const prompt = [
    instructions,
    `\n# OUTPUT CONTRACT\nReturn ONLY a single JSON object (no prose, no markdown fences) that validates against this JSON Schema:\n${schema}`,
    `\n# AGENT UNDER TEST\n${agent}`,
    `\n# TASK PROMPT GIVEN TO THE AGENT\n${task.prompt}`,
    `\n# EXPECTED OUTPUT (informational)\n${task.expected_output}`,
    `\n# ASSERTIONS (judge each)\n${task.assertions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`,
    `\n# SKILL UNDER TEST\n${task.skill} (deps: ${task.deps.join(", ") || "none"})`,
    `\n# NON-LLM SKILL-LOAD SIGNAL\nloaded=${skillSignal?.loaded ?? "unknown"}; evidence=${skillSignal?.evidence ?? "none"}\nUse this only as a hint; base the final skill_loaded verdict on the transcript and artifacts.`,
    `\n# FILES CREATED IN WORKING DIR\n${files.map((f) => `${f.path} (${f.bytes}b)`).join("\n") || "(none)"}`,
    `\n# FILE PREVIEWS\n${filePreviews || "(none)"}`,
    devExec ? `\n# GENERATED SCRIPT EXECUTION (the harness actually ran the agent's script)\n${
      devExec.ran
        ? `file=${devExec.file}\nexit_code=${devExec.exit_code}\ntimed_out=${devExec.timed_out}\nprinted_expected_title=${devExec.printed_expected_title} (expected "${STEEL_TITLE_MARKER}")\nstdout_tail:\n${devExec.stdout_tail}\nstderr_tail:\n${devExec.stderr_tail}`
        : `not run: ${devExec.reason}`
    }\nTreat a clean exit that prints the expected title as the task genuinely working; a non-zero exit or missing title means the generated code does not actually run.` : "",
    `\n# AGENT TRANSCRIPT (${excerpt.note}; capped at 120k chars)\n${excerpt.text}`,
  ].join("\n")
    // Some agents (pi) emit NUL bytes in their transcript; passed as a CLI arg to `claude -p` they
    // throw "must be a string without null bytes" and the judge never runs. Strip NULs defensively.
    .replace(/\u0000/g, "");
  writeFileSync(join(runDir, "judge-prompt.txt"), prompt);

  // NOTE: this claude build emits 0 bytes with --json-schema, and --bare disables team-plan
  // auth ("Not logged in"). So we enforce JSON via the prompt and extract it from .result.
  const { cmd: jCmd, skip: jSkip } = resolveClaude(config.judge.cmd);
  const args = jSkip ? ["--dangerously-skip-permissions"] : [];
  args.push("-p", prompt, "--output-format", "json");
  if (config.judge.model) args.push("--model", config.judge.model);
  const r = await run(jCmd, args, { cwd: here, timeoutSec: 300 });
  writeFileSync(join(runDir, "judge-raw.json"), r.stdout || r.stderr);
  return normalizeVerdict(parseVerdict(r.stdout));
}

// ---- main -----------------------------------------------------------------
function transcriptText(runDir) {
  const p = join(runDir, "transcript.jsonl");
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

async function runOne(agent, task) {
  const aCfg = config.agents[agent];
  // Substitute the real seeded session id before anything reads the prompt/assertions.
  task = resolveTask(task);
  const { runDir, cwd } = setupRunDir(agent, task);
  const spec = RUNNERS[agent](task, { cwd, model: aCfg.model, timeoutSec: aCfg.timeoutSec });
  console.log(`\n▶ ${agent} :: ${task.task_id}`);
  console.log(`  $ ${spec.cmd} ${redactArgs(spec.args).map((a) => (a.includes(" ") ? JSON.stringify(a) : a)).join(" ")}`);
  const startMs = Date.now();
  const r = await run(spec.cmd, spec.args, { cwd: spec.cwd, timeoutSec: spec.timeoutSec });
  const endMs = Date.now();
  writeFileSync(join(runDir, "stdout.txt"), r.stdout);
  writeFileSync(join(runDir, "stderr.txt"), r.stderr);

  // Resolve transcript.
  let transcriptPath = null;
  if (spec.stdoutIsTranscript) {
    transcriptPath = join(runDir, "transcript.jsonl");
    writeFileSync(transcriptPath, r.stdout);
  }
  if (spec.locate) {
    const located = spec.locate(r.stdout, runDir, cwd, startMs);
    if (located && existsSync(located)) {
      copyFileSync(located, join(runDir, "transcript.jsonl"));
      transcriptPath = join(runDir, "transcript.jsonl");
    }
  }
  const tText = transcriptText(runDir);
  const skillSignal = detectSkillSignal(tText + "\n" + r.stdout, task);
  const usage = extractUsage(agent, { stdout: r.stdout, transcript: tText });

  // For skills that produce runnable code, execute it to verify it actually works.
  let devExec = null;
  if (EXEC_SKILLS.has(task.skill)) {
    devExec = await execGeneratedScript(cwd, runDir, aCfg.timeoutSec);
    const note = devExec.ran
      ? `exit=${devExec.exit_code}${devExec.timed_out ? " (TIMEOUT)" : ""} printed_title=${devExec.printed_expected_title}`
      : `skipped (${devExec.reason})`;
    console.log(`  ⚙ exec generated script: ${note}`);
  }

  // Steel browser sessions opened during this run (count + duration/credits) — a cost proxy. Fetched
  // after the optional exec so a session the generated script opens is counted too. Buffer the window
  // slightly so sessions created right at the boundaries are captured.
  const steelSessions = await fetchSteelSessions({ sinceMs: startMs - 3000, untilMs: Date.now() + 3000 });

  const meta = {
    agent, task_id: task.task_id, skill: task.skill, deps: task.deps,
    // Resolved (post-substitution) prompt/assertions actually shown to the agent — so --rejudge
    // scores against what really ran, not the un-substituted {{session_id}} token in tasks.json.
    prompt: task.prompt, assertions: task.assertions, expected_output: task.expected_output,
    ...(task.requires_fixture ? { fixture_session_id: fixtures.session_id } : {}),
    ...(devExec ? { dev_exec: devExec } : {}),
    cmd: spec.cmd, args: redactArgs(spec.args), model: aCfg.model,
    exit_code: r.code, signal: r.signal, timed_out: !!r.timedOut, duration_ms: r.ms,
    started_at: new Date(startMs).toISOString(), ended_at: new Date(endMs).toISOString(),
    cwd, transcript_bytes: tText.length, skill_signal: skillSignal, usage, steel_sessions: steelSessions,
    stdout_bytes: r.stdout.length, stderr_bytes: r.stderr.length,
  };
  writeFileSync(join(runDir, "meta.json"), JSON.stringify(meta, null, 2));
  const sessInfo = steelSessions.available ? `steel_sessions=${steelSessions.count}` : "steel_sessions=n/a";
  console.log(`  exit=${r.code} ${r.timedOut ? "(TIMEOUT) " : ""}dur=${(r.ms / 1000).toFixed(1)}s transcript=${tText.length}b skill_signal=${skillSignal.loaded} ${sessInfo}`);

  let verdict = null;
  if (!noJudge) {
    if (!tText) { console.log("  ! no transcript captured — skipping judge"); }
    else {
      verdict = await judge(task, agent, runDir, cwd, tText, skillSignal, devExec);
      writeFileSync(join(runDir, "verdict.json"), JSON.stringify(verdict, null, 2));
      console.log(`  verdict: ${verdict?.overall ?? "?"}  skill_loaded=${verdict?.skill_loaded ?? "?"}`);
    }
  }
  return { ...meta, runDir, verdict };
}

// Re-judge an existing run dir without re-running the agent.
if (rejudgeDir) {
  const runDir = resolve(rejudgeDir);
  const meta = JSON.parse(readFileSync(join(runDir, "meta.json"), "utf8"));
  const base = tasksDoc.tasks.find((t) => t.task_id === meta.task_id);
  if (!base) throw new Error(`task ${meta.task_id} not found in tasks.json`);
  // Prefer the resolved prompt/assertions stored in meta (the exact text the agent saw); older runs
  // predate that field, so fall back to the tasks.json definition.
  const task = {
    ...base,
    prompt: meta.prompt ?? base.prompt,
    assertions: meta.assertions ?? base.assertions,
    expected_output: meta.expected_output ?? base.expected_output,
  };
  const tText = transcriptText(runDir);
  const skillSignal = meta.skill_signal || detectSkillSignal(tText, task);
  console.log(`▶ rejudge ${meta.agent} :: ${meta.task_id} (transcript ${tText.length}b)`);
  const verdict = await judge(task, meta.agent, runDir, meta.cwd, tText, skillSignal, meta.dev_exec ?? null);
  writeFileSync(join(runDir, "verdict.json"), JSON.stringify(verdict, null, 2));
  console.log(`  verdict: ${verdict?.overall ?? "?"}  skill_loaded=${verdict?.skill_loaded ?? "?"}`);
  process.exit(0);
}

// Seed the shared fixture session up front if any selected task consumes it. Done once before the
// matrix (sequential runs share one real failed session), so no per-task ordering is required.
const selectedTasks = tasksDoc.tasks.filter((t) => !onlyTask || t.task_id === onlyTask);
const needsFixture = selectedTasks.some((t) => t.requires_fixture);
if (needsFixture && !noSeed) {
  runSeed();
} else if (needsFixture && noSeed) {
  if (!fixtures.session_id) throw new Error("--no-seed set but runs/_fixtures.json has no session_id; seed once or drop --no-seed");
  console.log(`\n● reusing existing fixture session ${fixtures.session_id} (--no-seed)`);
}

const results = [];
for (const task of tasksDoc.tasks) {
  if (onlyTask && task.task_id !== onlyTask) continue;
  for (const agent of task.agents) {
    if (onlyAgent && agent !== onlyAgent) continue;
    if (!config.agents[agent]?.enabled) continue;
    try {
      results.push(await runOne(agent, task));
    } catch (e) {
      console.error(`  ✗ ${agent} ${task.task_id}: ${e.message}`);
      results.push({ agent, task_id: task.task_id, error: e.message });
    }
  }
}

// Append to results.jsonl
const resultsFile = join(here, "runs", "results.jsonl");
mkdirSync(dirname(resultsFile), { recursive: true });
const lines = results.map((r) => JSON.stringify({
  agent: r.agent, task_id: r.task_id, skill: r.skill,
  exit_code: r.exit_code, timed_out: r.timed_out, duration_ms: r.duration_ms,
  skill_signal: r.skill_signal?.loaded, skill_loaded: r.verdict?.skill_loaded,
  overall: r.verdict?.overall, cost_usd: r.usage?.cost_usd ?? null,
  steel_sessions: r.steel_sessions?.available ? r.steel_sessions.count : null,
  run_dir: r.runDir, error: r.error,
})).join("\n");
writeFileSync(resultsFile, (lines ? lines + "\n" : ""), { flag: "a" });

console.log(`\nDone: ${results.length} run(s). Results appended to runs/results.jsonl`);
