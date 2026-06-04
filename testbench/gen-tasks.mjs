// ABOUTME: Generates tasks.json from each skill's evals/evals.json plus manifest.json.
// ABOUTME: Picks one "smoke" eval per skill, resolves skill deps, and maps allowed agents.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const config = JSON.parse(readFileSync(join(here, "config.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(repoRoot, "manifest.json"), "utf8"));

// Testbench-local eval fixes. The source skills/evals.json files are never modified; instead we
// merge per-task overrides (prompt / assertions / expected_output) keyed by task_id.
const overridesPath = join(here, "eval-overrides.json");
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};

// Map manifest agent identifiers -> testbench runner keys (cursor is out of scope).
const AGENT_MAP = { "claude-code": "claude", codex: "codex", opencode: "opencode", pi: "pi" };

// Resolve transitive skill dependencies, dropping the non-skill "steel-cli" runtime dep.
function resolveDeps(skillName, seen = new Set()) {
  const entry = manifest.skills[skillName];
  if (!entry) return [];
  for (const dep of entry.requires || []) {
    if (dep === "steel-cli" || seen.has(dep)) continue;
    if (!manifest.skills[dep]) continue; // only skill deps are symlinkable
    seen.add(dep);
    resolveDeps(dep, seen);
  }
  return [...seen];
}

const smokeId = config.smokeEvalId ?? 1;
const tasks = [];

for (const [skillName, entry] of Object.entries(manifest.skills)) {
  const skillPath = entry.path;
  const evalsFile = join(repoRoot, skillPath, "evals", "evals.json");
  let evalsDoc;
  try {
    evalsDoc = JSON.parse(readFileSync(evalsFile, "utf8"));
  } catch (err) {
    console.error(`! skip ${skillName}: cannot read evals (${err.message})`);
    continue;
  }
  const evals = evalsDoc.evals || [];
  const chosen = evals.find((e) => e.id === smokeId) || evals[0];
  if (!chosen) {
    console.error(`! skip ${skillName}: no evals`);
    continue;
  }

  const agents = (entry.agents || [])
    .map((a) => AGENT_MAP[a])
    .filter(Boolean);

  const taskId = `${skillName}__e${chosen.id}`;
  const ov = overrides[taskId] || {};
  const overridden = Object.keys(ov).filter((k) => !k.startsWith("_"));
  const prompt = ov.prompt ?? chosen.prompt;
  const assertions = ov.assertions ?? chosen.assertions ?? [];
  // A task "consumes" the seeded fixture when it references {{session_id}}; orchestrate runs the
  // seed first and substitutes the real id at run time.
  const requiresFixture = /\{\{session_id\}\}/.test(prompt) || assertions.some((a) => /\{\{session_id\}\}/.test(a));
  tasks.push({
    task_id: taskId,
    skill: skillName,
    skill_path: skillPath,
    deps: resolveDeps(skillName), // skill names; their paths == manifest.skills[name].path
    eval_id: chosen.id,
    prompt,
    expected_output: ov.expected_output ?? chosen.expected_output ?? "",
    assertions,
    agents,
    ...(requiresFixture ? { requires_fixture: true } : {}),
    ...(overridden.length ? { overridden } : {}),
  });
}

const out = { generated_from: "evals + manifest", smoke_eval_id: smokeId, count: tasks.length, tasks };
writeFileSync(join(here, "tasks.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${tasks.length} tasks to tasks.json`);
for (const t of tasks) {
  console.log(`  ${t.task_id}  agents=[${t.agents.join(",")}]  deps=[${t.deps.join(",")}]${t.requires_fixture ? "  fixture=session_id" : ""}${t.overridden ? `  overridden=[${t.overridden.join(",")}]` : ""}`);
}
