#!/usr/bin/env node
// ABOUTME: Validate a generated skill directory for basic Agent Skill structure.
// ABOUTME: Checks frontmatter, README, evals, and one-level reference links.

import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function usage() {
  return "Usage: node scripts/validate-skill.mjs <skill-dir>";
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) throw new Error("SKILL.md must start with YAML frontmatter");
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("SKILL.md frontmatter is not closed");
  const yaml = content.slice(4, end);
  const fields = {};
  for (const line of yaml.split("\n")) {
    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (match) fields[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return fields;
}

async function assertFile(path, label) {
  const info = await stat(path).catch((error) => {
    if (error?.code === "ENOENT") throw new Error(`${label} missing: ${path}`);
    throw error;
  });
  if (!info.isFile()) throw new Error(`${label} is not a file: ${path}`);
}

async function main() {
  const dir = process.argv[2];
  if (!dir || dir === "-h" || dir === "--help") {
    console.log(usage());
    process.exit(dir ? 0 : 1);
  }

  const root = resolve(dir);
  await assertFile(resolve(root, "SKILL.md"), "SKILL.md");
  await assertFile(resolve(root, "README.md"), "README.md");
  await assertFile(resolve(root, "evals", "evals.json"), "evals/evals.json");

  const skill = await readFile(resolve(root, "SKILL.md"), "utf8");
  const frontmatter = parseFrontmatter(skill);
  if (!NAME_RE.test(frontmatter.name ?? "")) throw new Error("frontmatter.name must be lowercase kebab-case");
  if (!frontmatter.description || frontmatter.description.length > 1024) {
    throw new Error("frontmatter.description must be present and <= 1024 characters");
  }

  const evals = JSON.parse(await readFile(resolve(root, "evals", "evals.json"), "utf8"));
  if (!Array.isArray(evals.evals) || evals.evals.length < 3) throw new Error("evals/evals.json must include at least three evals");
  for (const item of evals.evals) {
    if (!Array.isArray(item.assertions)) throw new Error(`eval ${item.id ?? "unknown"} must use assertions`);
  }

  const refsDir = resolve(root, "references");
  const refs = await readdir(refsDir).catch(() => []);
  for (const ref of refs) {
    if (ref.includes("/")) throw new Error(`reference must be one level deep: ${ref}`);
  }

  console.log("OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
