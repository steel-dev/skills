#!/usr/bin/env node
// ABOUTME: Scaffold a browser task skill from templates/browser-task-skill.
// ABOUTME: Replaces basic placeholders and refuses to overwrite unless --force is passed.

import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function usage() {
  return "Usage: node scripts/scaffold-skill.mjs <skill-name> --out <dir> [--description <text>] [--force]";
}

function parseArgs(argv) {
  const args = { name: undefined, out: undefined, description: undefined, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "--description") {
      args.description = argv[i + 1];
      i += 1;
    } else if (arg === "--force") {
      args.force = true;
    } else if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    } else if (!args.name) {
      args.name = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  if (!args.name || !args.out) throw new Error(usage());
  if (!NAME_RE.test(args.name)) throw new Error("Skill name must be lowercase kebab-case.");
  return args;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function replaceInFile(path, replacements) {
  let content = await readFile(path, "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    content = content.split(from).join(to);
  }
  await writeFile(path, content);
}

function yamlSingleQuoted(value) {
  return value.replace(/'/g, "''");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const template = resolve(fileURLToPath(new URL("..", import.meta.url)), "templates", "browser-task-skill");
  const target = resolve(args.out, args.name);

  if ((await exists(target)) && !args.force) {
    throw new Error(`Target already exists: ${target}. Use --force to overwrite.`);
  }

  await mkdir(resolve(args.out), { recursive: true });
  await cp(template, target, { recursive: true, force: true });
  const description =
    args.description ??
    `Performs a recurring browser task with Steel. Use when the user asks to run the ${args.name} workflow with concrete inputs.`;
  await replaceInFile(resolve(target, "SKILL.md"), {
    "__SKILL_NAME__": args.name,
    "__DESCRIPTION__": yamlSingleQuoted(description),
  });
  await replaceInFile(resolve(target, "README.md"), {
    "__SKILL_NAME__": args.name,
  });
  console.log(target);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
