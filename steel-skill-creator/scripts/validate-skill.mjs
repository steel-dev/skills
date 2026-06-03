#!/usr/bin/env node
// ABOUTME: Validate a generated skill directory for basic Agent Skill structure.
// ABOUTME: Checks frontmatter, README, evals, and one-level reference links.

import { readFile, readdir, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";

const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function usage() {
  return "Usage: node scripts/validate-skill.mjs <skill-dir>";
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

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) throw new Error("SKILL.md must start with YAML frontmatter");
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("SKILL.md frontmatter is not closed");
  const lines = content.slice(4, end).split("\n");
  const fields = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (/^\s/.test(line)) throw new Error(`Unexpected indented frontmatter line: ${line}`);

    const match = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!match) throw new Error(`Unsupported frontmatter line: ${line}`);

    const key = match[1];
    const raw = match[2].trim();

    if ([">", ">-", "|", "|-"].includes(raw)) {
      throw new Error(`${key} must be single-line; block scalars are not supported`);
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
          if (kind === "map") throw new Error(`${key} cannot mix list and map values`);
          kind = "list";
          values.push(stripQuotes(listMatch[1].trim()));
        } else if (mapMatch) {
          if (kind === "list") throw new Error(`${key} cannot mix list and map values`);
          kind = "map";
          map[mapMatch[1]] = stripQuotes(mapMatch[2].trim());
        } else {
          throw new Error(`Unsupported nested frontmatter line: ${nested}`);
        }
      }
      if (!kind) throw new Error(`${key} must have a value`);
      fields[key] = kind === "list" ? values : map;
    } else {
      fields[key] = stripQuotes(raw);
    }
  }
  return fields;
}

function markdownBody(content) {
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("SKILL.md frontmatter is not closed");
  return content.slice(end + 5);
}

async function assertFile(path, label) {
  const info = await stat(path).catch((error) => {
    if (error?.code === "ENOENT") throw new Error(`${label} missing: ${path}`);
    throw error;
  });
  if (!info.isFile()) throw new Error(`${label} is not a file: ${path}`);
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
  return /\bSteel CLI\b|\bsteel\s+(?:--json|--version|login|doctor|skills|scrape|screenshot|pdf|browser|credentials)\b/.test(body);
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
  const body = markdownBody(skill);
  if (!NAME_RE.test(frontmatter.name ?? "")) throw new Error("frontmatter.name must be lowercase kebab-case");
  if (frontmatter.name !== basename(root)) throw new Error("frontmatter.name must match the skill directory name");
  if (!frontmatter.description || frontmatter.description.length > 1024) {
    throw new Error("frontmatter.description must be present and <= 1024 characters");
  }
  if (frontmatter.license !== "MIT") throw new Error("frontmatter.license must be MIT");
  if (typeof frontmatter.compatibility !== "string") throw new Error("frontmatter.compatibility is required");
  for (const agent of ["claude-code", "codex", "opencode"]) {
    if (!frontmatter.compatibility.split(",").map((item) => item.trim()).includes(agent)) {
      throw new Error(`frontmatter.compatibility must include ${agent}`);
    }
  }
  if (!frontmatter.metadata || typeof frontmatter.metadata !== "object" || Array.isArray(frontmatter.metadata)) {
    throw new Error("frontmatter.metadata must be a string-to-string map");
  }
  for (const key of ["owner", "category", "stage"]) {
    if (!frontmatter.metadata[key]) throw new Error(`frontmatter.metadata.${key} is required`);
  }
  if (usesSteelAllowedTool(frontmatter) && !hasSteelCliReference(body)) {
    throw new Error("allowed-tools Bash(steel:*) requires a Steel CLI reference in SKILL.md");
  }

  const evals = JSON.parse(await readFile(resolve(root, "evals", "evals.json"), "utf8"));
  if (!Array.isArray(evals.evals) || evals.evals.length < 3) throw new Error("evals/evals.json must include at least three evals");
  const evalIds = new Set();
  for (const item of evals.evals) {
    if (item.id === undefined || item.id === null || item.id === "") throw new Error("eval id is required");
    if (evalIds.has(item.id)) throw new Error(`duplicate eval id ${item.id}`);
    evalIds.add(item.id);
    if (typeof item.prompt !== "string" || !item.prompt.trim()) throw new Error(`eval ${item.id} prompt is required`);
    if (!Array.isArray(item.assertions) || item.assertions.length === 0) {
      throw new Error(`eval ${item.id} must use non-empty assertions`);
    }
    for (const assertion of item.assertions) {
      if (typeof assertion !== "string" || !assertion.trim()) throw new Error(`eval ${item.id} has an empty assertion`);
    }
  }

  const refsDir = resolve(root, "references");
  const refs = await readdir(refsDir, { withFileTypes: true }).catch(() => []);
  for (const ref of refs) {
    if (!ref.isFile()) throw new Error(`reference must be one level deep: ${ref.name}`);
  }
  for (const ref of referencedMarkdownFiles(skill)) {
    await assertFile(resolve(root, ref), "referenced file");
  }

  console.log("OK");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
