#!/usr/bin/env node
// ABOUTME: Validate Steel skills catalog structure and manifest consistency.
// ABOUTME: Intended for local checks and CI.

import { access, readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ALLOWED_STAGES = new Set(["ga", "beta", "experimental"]);

function fail(message) {
  throw new Error(message);
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

function parseFrontmatter(content, file) {
  if (!content.startsWith("---\n")) fail(`${file} must start with YAML frontmatter`);
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) fail(`${file} frontmatter is not closed`);
  const yaml = content.slice(4, end);
  const fields = {};
  for (const line of yaml.split("\n")) {
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return fields;
}

async function validateSkill(name, meta) {
  if (!NAME_RE.test(name)) fail(`Invalid skill name in manifest: ${name}`);
  if (!meta.cli || typeof meta.cli.include !== "boolean") fail(`${name}: cli.include must be explicit`);
  if (!ALLOWED_STAGES.has(meta.stage)) fail(`${name}: invalid stage ${meta.stage}`);
  if (!Array.isArray(meta.agents) || meta.agents.length === 0) fail(`${name}: agents must be non-empty`);
  if (!meta.install?.skills_cli?.includes(`--skill ${name}`)) fail(`${name}: install.skills_cli must include --skill ${name}`);

  const skillDir = resolve(ROOT, meta.path ?? name);
  await assertFile(resolve(skillDir, "SKILL.md"), `${name} SKILL.md`);
  await assertFile(resolve(skillDir, "README.md"), `${name} README.md`);
  await assertFile(resolve(skillDir, "evals", "evals.json"), `${name} evals`);

  const skillMd = await readFile(resolve(skillDir, "SKILL.md"), "utf8");
  const frontmatter = parseFrontmatter(skillMd, `${name}/SKILL.md`);
  if (frontmatter.name !== name) fail(`${name}: frontmatter.name must match manifest key`);
  if (!frontmatter.description || frontmatter.description.length > 1024) {
    fail(`${name}: frontmatter.description must be present and <= 1024 chars`);
  }

  const evals = JSON.parse(await readFile(resolve(skillDir, "evals", "evals.json"), "utf8"));
  if (evals.skill_name !== name) fail(`${name}: evals.skill_name must match`);
  if (!Array.isArray(evals.evals) || evals.evals.length < 3) fail(`${name}: must have at least three evals`);
  for (const item of evals.evals) {
    if (!Array.isArray(item.assertions)) fail(`${name}: eval ${item.id ?? "unknown"} must use assertions`);
  }

  const refsDir = resolve(skillDir, "references");
  if (await exists(refsDir)) {
    const refs = await readdir(refsDir, { withFileTypes: true });
    for (const ref of refs) {
      if (!ref.isFile()) fail(`${name}: references must be one level deep (${ref.name})`);
    }
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
    await validateSkill(name, meta);
  }

  console.log(`OK: ${Object.keys(manifest.skills).length} skills validated`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
