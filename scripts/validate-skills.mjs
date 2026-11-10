#!/usr/bin/env node
// ABOUTME: Validate Steel skills catalog structure and manifest consistency.
// ABOUTME: Intended for local checks and CI.

import { access, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ALLOWED_STAGES = new Set(["ga", "beta", "experimental"]);

function fail(message) {
  throw new Error(message);
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    return value.slice(1, -1);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function parseFrontmatter(content, file, blockFields = []) {
  if (!content.startsWith("---\n")) fail(`${file} must start with YAML frontmatter`);
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) fail(`${file} frontmatter is not closed`);

  const lines = content.slice(4, end).split("\n");
  const fields = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (/^\s/.test(line)) fail(`${file} has unexpected indented frontmatter line: ${line}`);

    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!match) fail(`${file} has unsupported frontmatter line: ${line}`);

    const key = match[1];
    const raw = match[2].trim();
    if (Object.hasOwn(fields, key)) fail(`${file}: duplicate field ${key}`);

    if (raw === "|" && blockFields.includes(key)) {
      const body = [];
      while (index + 1 < lines.length && (/^\s+/.test(lines[index + 1]) || !lines[index + 1].trim())) {
        body.push(lines[++index]);
      }
      fields[key] = body.join("\n").trim();
      continue;
    }
    if ([">", ">-", "|", "|-"].includes(raw)) {
      fail(`${file} ${key} must be single-line; block scalars are not supported`);
    }

    if (raw === "") {
      const values = [];
      const map = {};
      let kind = null;
      while (index + 1 < lines.length && (/^\s+/.test(lines[index + 1]) || !lines[index + 1].trim())) {
        index += 1;
        const nested = lines[index];
        if (!nested.trim()) continue;

        const listMatch = nested.match(/^\s+-\s*(.*)$/);
        const mapMatch = nested.match(/^\s+([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (listMatch) {
          if (kind === "map") fail(`${file} ${key} cannot mix list and map values`);
          kind = "list";
          values.push(stripQuotes(listMatch[1].trim()));
        } else if (mapMatch) {
          if (kind === "list") fail(`${file} ${key} cannot mix list and map values`);
          kind = "map";
          map[mapMatch[1]] = stripQuotes(mapMatch[2].trim());
        } else {
          fail(`${file} has unsupported nested frontmatter line: ${nested}`);
        }
      }
      if (!kind) fail(`${file} ${key} must have a value`);
      fields[key] = kind === "list" ? values : map;
    } else {
      fields[key] = stripQuotes(raw);
    }
  }

  return fields;
}

function markdownBody(content, file) {
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) fail(`${file} frontmatter is not closed`);
  return content.slice(end + 5);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function assertFile(path, label) {
  const info = await stat(path).catch((error) => {
    if (error?.code === "ENOENT") fail(`${label} missing: ${path}`);
    throw error;
  });
  if (!info.isFile()) fail(`${label} is not a file: ${path}`);
}

function assertInside(parent, child, label) {
  const rel = relative(resolve(parent), resolve(child));
  if (rel === "" || (!rel.startsWith("..") && !rel.startsWith("/"))) return;
  fail(`${label} must stay inside ${parent}: ${child}`);
}

function referencedMarkdownFiles(content) {
  const refs = new Set();
  const pattern = /(?:\[[^\]]+\]\(|`)(references\/[A-Za-z0-9_.-]+\.md)(?:\)|`)/g;
  for (const match of content.matchAll(pattern)) refs.add(match[1]);
  return refs;
}

function usesSteelAllowedTool(frontmatter) {
  const allowedTools = frontmatter["allowed-tools"];
  const values = Array.isArray(allowedTools) ? allowedTools : [allowedTools].filter(Boolean);
  return values.some((value) => String(value).includes("Bash(steel:*)"));
}

function hasSteelCliReference(body) {
  return /\bsteel\b/i.test(body);
}

// Validate/discover the named case folders without invoking a model or service.
// This uses the same deliberately small YAML subset as the catalog validator.
export async function validateEvalCases(evalsDir) {
  let count = 0;
  for (const entry of await readdir(evalsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") ||
        ["results", "files", "mocks", "node_modules"].includes(entry.name)) continue;
    const dir = resolve(evalsDir, entry.name);
    const label = `evals/${entry.name}`;
    if (!NAME_RE.test(entry.name)) fail(`${label}: invalid case name`);
    const yaml = await readFile(resolve(dir, "case.yaml"), "utf8");
    if (!/^schema_version:\s*(["'])1\.1\1\s*$/m.test(yaml)) fail(`${label}: schema_version must be quoted 1.1`);
    const meta = parseFrontmatter(`---\n${yaml.trimEnd()}\n---\n`, `${label}/case.yaml`, ["expected_outcome"]);
    if (Object.keys(meta).some((key) => !["schema_version", "name", "expected_outcome", "context"].includes(key))) {
      fail(`${label}: unknown case field`);
    }
    if (meta.name !== entry.name || typeof meta.expected_outcome !== "string" || !meta.expected_outcome.trim()) {
      fail(`${label}: name/outcome is missing or mismatched`);
    }
    if (meta.context !== undefined) {
      if (!meta.context || typeof meta.context !== "object" || Array.isArray(meta.context) ||
          Object.keys(meta.context).join() !== "scaffold_script" || typeof meta.context.scaffold_script !== "string") {
        fail(`${label}: context must name a scaffold_script`);
      }
      const scaffold = resolve(dir, meta.context.scaffold_script);
      assertInside(dir, scaffold, `${label}: scaffold`);
      await assertFile(scaffold, `${label}: scaffold`);
    }
    const prompt = await readFile(resolve(dir, "prompt.md"), "utf8");
    const settings = parseFrontmatter(prompt, `${label}/prompt.md`);
    if (Object.keys(settings).some((key) => !["tags", "max_turns", "timeout_seconds", "allowed_tools"].includes(key))) {
      fail(`${label}: unknown prompt setting`);
    }
    for (const key of ["max_turns", "timeout_seconds"]) {
      if (!/^[1-9][0-9]*$/.test(settings[key] ?? "")) fail(`${label}: ${key} must be a positive integer`);
    }
    for (const key of ["tags", "allowed_tools"]) {
      if (typeof settings[key] !== "string" || !/^\[\s*[^\[\]\n]+\s*\]$/.test(settings[key])) {
        fail(`${label}: ${key} must be a non-empty inline list`);
      }
    }
    if (!markdownBody(prompt, label).trim()) fail(`${label}: task prompt is empty`);
    const gradersDir = resolve(dir, "graders");
    const graders = (await readdir(gradersDir)).filter((name) => name.endsWith(".md"));
    if (!graders.length) fail(`${label}: at least one grader is required`);
    for (const file of graders) {
      const content = await readFile(resolve(gradersDir, file), "utf8");
      const grader = parseFrontmatter(content, `${label}/graders/${file}`);
      if (grader.type !== "llm" || grader.focus !== "trace" || !Number.isFinite(Number(grader.weight)) || !(Number(grader.weight) > 0) || !markdownBody(content, file).trim()) {
        fail(`${label}/graders/${file}: expected a weighted llm trace assertion`);
      }
    }
    count += 1;
  }
  return count;
}

async function validateSkill(name, meta) {
  if (!NAME_RE.test(name)) fail(`Invalid skill name in manifest: ${name}`);
  if (!meta.cli || typeof meta.cli.include !== "boolean") fail(`${name}: cli.include must be explicit`);
  if (!ALLOWED_STAGES.has(meta.stage)) fail(`${name}: invalid stage ${meta.stage}`);
  if (!Array.isArray(meta.agents) || meta.agents.length === 0) fail(`${name}: agents must be non-empty`);
  if (!meta.install?.skills_cli?.includes(`--skill ${name}`)) fail(`${name}: install.skills_cli must include --skill ${name}`);

  const skillDir = resolve(ROOT, meta.path ?? name);
  assertInside(ROOT, skillDir, `${name}: path`);
  await assertFile(resolve(skillDir, "SKILL.md"), `${name} SKILL.md`);
  await assertFile(resolve(skillDir, "README.md"), `${name} README.md`);
  await assertFile(resolve(skillDir, "evals", "evals.json"), `${name} evals`);

  const skillMd = await readFile(resolve(skillDir, "SKILL.md"), "utf8");
  const frontmatter = parseFrontmatter(skillMd, `${name}/SKILL.md`);
  const body = markdownBody(skillMd, `${name}/SKILL.md`);
  if (frontmatter.name !== name) fail(`${name}: frontmatter.name must match manifest key`);
  if (!frontmatter.description || frontmatter.description.length > 1024) {
    fail(`${name}: frontmatter.description must be present and <= 1024 chars`);
  }
  if (!frontmatter.license) fail(`${name}: frontmatter.license must be present`);
  if (typeof frontmatter.compatibility !== "string" || !frontmatter.compatibility.trim()) {
    fail(`${name}: frontmatter.compatibility is required`);
  }
  if (!frontmatter.metadata || typeof frontmatter.metadata !== "object" || Array.isArray(frontmatter.metadata)) {
    fail(`${name}: frontmatter.metadata must be a string-to-string map`);
  }
  for (const key of ["owner", "category", "stage"]) {
    if (!frontmatter.metadata[key]) fail(`${name}: frontmatter.metadata.${key} is required`);
  }
  if (usesSteelAllowedTool(frontmatter) && !hasSteelCliReference(body)) {
    fail(`${name}: allowed-tools Bash(steel:*) requires a Steel CLI reference in SKILL.md`);
  }

  const evals = JSON.parse(await readFile(resolve(skillDir, "evals", "evals.json"), "utf8"));
  if (evals.skill_name !== name) fail(`${name}: evals.skill_name must match`);
  if (!Array.isArray(evals.evals) || evals.evals.length < 3) fail(`${name}: must have at least three evals`);
  const evalIds = new Set();
  for (const item of evals.evals) {
    if (item.id === undefined || item.id === null || item.id === "") fail(`${name}: eval id is required`);
    if (evalIds.has(item.id)) fail(`${name}: duplicate eval id ${item.id}`);
    evalIds.add(item.id);
    if (typeof item.prompt !== "string" || !item.prompt.trim()) fail(`${name}: eval ${item.id} prompt is required`);
    if (!Array.isArray(item.assertions) || item.assertions.length === 0) {
      fail(`${name}: eval ${item.id} must use non-empty assertions`);
    }
    for (const assertion of item.assertions) {
      if (typeof assertion !== "string" || !assertion.trim()) fail(`${name}: eval ${item.id} has an empty assertion`);
    }
  }
  const caseCount = await validateEvalCases(resolve(skillDir, "evals"));
  if (caseCount) console.log(`OK: ${name}: ${caseCount} named eval cases validated`);

  const refsDir = resolve(skillDir, "references");
  if (await exists(refsDir)) {
    const refs = await readdir(refsDir, { withFileTypes: true });
    for (const ref of refs) {
      if (!ref.isFile()) fail(`${name}: references must be one level deep (${ref.name})`);
    }
  }
  for (const ref of referencedMarkdownFiles(skillMd)) {
    await assertFile(resolve(skillDir, ref), `${name} referenced file`);
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(resolve(ROOT, "manifest.json"), "utf8"));
  if (manifest.schema !== 1) fail("manifest.schema must be 1");
  if (!manifest.version) fail("manifest.version is required");
  if (!manifest.skills || typeof manifest.skills !== "object") fail("manifest.skills is required");

  const dirs = (await readdir(ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith("steel-"));

  for (const dir of dirs) {
    if (!manifest.skills[dir]) fail(`${dir}: directory exists but is missing from manifest`);
  }

  for (const [name, meta] of Object.entries(manifest.skills)) {
    if (Array.isArray(meta.requires)) {
      for (const requirement of meta.requires) {
        if (requirement !== "steel-cli" && !manifest.skills[requirement]) {
          fail(`${name}: requires unknown dependency ${requirement}`);
        }
      }
    }
    await validateSkill(name, meta);
  }

  console.log(`OK: ${Object.keys(manifest.skills).length} skills validated`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
