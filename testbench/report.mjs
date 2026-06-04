// ABOUTME: Renders testbench/REPORT.md from the newest run per (agent, task) under runs/.
// ABOUTME: Produces a cross-agent matrix, per-agent rollups, and per-run detail with evidence.

import { existsSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractUsage } from "./usage.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const runsRoot = join(here, "runs");
const config = JSON.parse(readFileSync(join(here, "config.json"), "utf8"));
const tasksDoc = JSON.parse(readFileSync(join(here, "tasks.json"), "utf8"));

const AGENTS = Object.keys(config.agents).filter((a) => config.agents[a].enabled);
const TASKS = tasksDoc.tasks;

const VERDICT_GLYPH = { pass: "✅", partial: "🟡", fail: "❌" };

function readJSON(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
function readText(p) { try { return readFileSync(p, "utf8"); } catch { return ""; } }
function fmtCost(c) { return typeof c === "number" ? `$${c.toFixed(4)}` : "—"; }
function fmtTok(u) { return (u && (u.input != null || u.output != null)) ? `${((u.input || 0) + (u.output || 0)).toLocaleString()}` : "—"; }

// Newest run dir for an (agent, task): runs/<agent>/<task>/<ts>/
function newestRun(agent, taskId) {
  const dir = join(runsRoot, agent, taskId);
  if (!existsSync(dir)) return null;
  const subs = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ name: e.name, p: join(dir, e.name), m: statSync(join(dir, e.name)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  return subs[0]?.p ?? null;
}

function cellFor(agent, task) {
  const runDir = newestRun(agent, task.task_id);
  if (!runDir) return { text: "·", run: null };
  const meta = readJSON(join(runDir, "meta.json")) || {};
  const verdict = readJSON(join(runDir, "verdict.json"));
  // Use meta.usage when present (newer runs); otherwise recompute from the stored transcript.
  const agentName = meta.agent || agent;
  const usage = meta.usage || extractUsage(agentName, {
    stdout: readText(join(runDir, "stdout.txt")),
    transcript: readText(join(runDir, "transcript.jsonl")),
  });
  const a = Array.isArray(verdict?.assertions) ? verdict.assertions : [];
  const pass = a.filter((x) => x.verdict === "pass").length;
  const skill = verdict?.skill_loaded === true ? "🧩" : verdict?.skill_loaded === false ? "🚫" : "❔";
  const ov = verdict?.overall;
  const glyph = VERDICT_GLYPH[ov] || (verdict?.error ? "⚠️parse" : "❔");
  const flags = `${meta.timed_out ? " ⏱" : ""}${verdict?.overall_derived ? " ᵈ" : ""}`;
  const text = verdict ? `${glyph} ${skill} ${pass}/${a.length}${flags}` : "⚠️norun";
  return { text, run: { runDir, meta, verdict, pass, total: a.length, ov, usage } };
}

// Build grid
const grid = {}; // taskId -> agent -> cell
for (const task of TASKS) {
  grid[task.task_id] = {};
  for (const agent of AGENTS) {
    grid[task.task_id][agent] = task.agents.includes(agent) ? cellFor(agent, task) : { text: "—", run: null };
  }
}

// --- Render ---------------------------------------------------------------
const L = [];
L.push("# Cross-agent skill testbench — report", "");
L.push(`Generated: ${new Date().toISOString()}`, "");
L.push("**Legend:** ✅ pass · 🟡 partial · ❌ fail · — n/a (skill not compatible) · · not run  ");
L.push("Skill load: 🧩 loaded · 🚫 not loaded · ❔ unknown. Cell = `verdict skill passed/total`. Flags: ⏱ timed out · ᵈ overall derived.", "");

// Matrix
L.push("## Matrix", "");
L.push(`| Skill / task | ${AGENTS.join(" | ")} |`);
L.push(`|---|${AGENTS.map(() => "---").join("|")}|`);
for (const task of TASKS) {
  const row = AGENTS.map((ag) => grid[task.task_id][ag].text);
  L.push(`| \`${task.task_id}\` | ${row.join(" | ")} |`);
}
L.push("");

// Per-agent rollup
L.push("## Per-agent rollup", "");
L.push("| Agent | pass | partial | fail | skill-load rate | runs | total cost | total tokens |");
L.push("|---|---|---|---|---|---|---|---|");
for (const agent of AGENTS) {
  let pass = 0, partial = 0, fail = 0, loaded = 0, runs = 0, cost = 0, costKnown = false, tokens = 0;
  for (const task of TASKS) {
    const c = grid[task.task_id][agent];
    if (!c.run) continue;
    runs++;
    if (c.run.ov === "pass") pass++;
    else if (c.run.ov === "partial") partial++;
    else if (c.run.ov === "fail") fail++;
    if (c.run.verdict?.skill_loaded === true) loaded++;
    const u = c.run.usage || {};
    if (typeof u.cost_usd === "number") { cost += u.cost_usd; costKnown = true; }
    tokens += (u.input || 0) + (u.output || 0);
  }
  const rate = runs ? `${loaded}/${runs}` : "—";
  L.push(`| ${agent} | ${pass} | ${partial} | ${fail} | ${rate} | ${runs} | ${costKnown ? fmtCost(cost) : "—"} | ${tokens ? tokens.toLocaleString() : "—"} |`);
}
L.push("");
L.push("_Cost note: codex/claude run on team plans — claude reports a list-price `total_cost_usd`; codex reports tokens only (no per-call cost)._", "");

// Cost & tokens matrix
L.push("## Cost & tokens (per run)", "");
L.push(`| Skill / task | ${AGENTS.join(" | ")} |`);
L.push(`|---|${AGENTS.map(() => "---").join("|")}|`);
for (const task of TASKS) {
  const row = AGENTS.map((ag) => {
    const c = grid[task.task_id][ag];
    if (!c.run) return task.agents.includes(ag) ? "·" : "—";
    const u = c.run.usage || {};
    return `${fmtCost(u.cost_usd)} · ${fmtTok(u)}t`;
  });
  L.push(`| \`${task.task_id}\` | ${row.join(" | ")} |`);
}
L.push("");

// Per-run detail
L.push("## Run detail", "");
for (const task of TASKS) {
  L.push(`### \`${task.task_id}\``, "");
  L.push(`> ${task.prompt}`, "");
  for (const agent of AGENTS) {
    const c = grid[task.task_id][agent];
    if (!c.run) {
      if (task.agents.includes(agent)) L.push(`- **${agent}**: _not run_`);
      continue;
    }
    const v = c.run.verdict || {};
    const dur = c.run.meta?.duration_ms ? `${Math.round(c.run.meta.duration_ms / 1000)}s` : "?";
    const u = c.run.usage || {};
    const head = `- **${agent}** — ${VERDICT_GLYPH[c.run.ov] || "❔"} ${c.run.ov ?? "?"} · skill ${v.skill_loaded === true ? "loaded" : v.skill_loaded === false ? "NOT loaded" : "?"} · ${c.run.pass}/${c.run.total} assertions · ${dur} · ${fmtCost(u.cost_usd)} · ${fmtTok(u)}t`;
    L.push(head);
    if (v.summary) L.push(`  - ${v.summary}`);
    const failed = (v.assertions || []).filter((x) => x.verdict !== "pass");
    for (const f of failed) L.push(`  - ${f.verdict === "fail" ? "❌" : "❔"} _${f.text}_ — ${f.evidence}`);
  }
  L.push("");
}

const out = join(here, "REPORT.md");
writeFileSync(out, L.join("\n") + "\n");
console.log(`Wrote ${out}`);
