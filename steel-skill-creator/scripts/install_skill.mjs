#!/usr/bin/env node
// ABOUTME: Install a generated skill into ~/.claude/skills/<name>/.
// ABOUTME: Takes SKILL.md content plus optional bundled files, refuses to overwrite without --force.

import { cp, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";

const SKILLS_ROOT = resolve(homedir(), ".claude", "skills");
const SKILL_NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function usage() {
  return [
    "Usage: node scripts/install_skill.mjs <name> --skill-md <path> [--bundle <src>:<dest-subdir>] [--force]",
    "",
    "Example:",
    "  node scripts/install_skill.mjs flight-price-probe --skill-md ./SKILL.md --bundle ./helper.mjs:scripts",
  ].join("\n");
}

function parseArgs(argv) {
  const args = { name: undefined, skillMd: undefined, bundles: [], force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--skill-md") {
      args.skillMd = argv[i + 1];
      i += 1;
    } else if (arg === "--bundle") {
      args.bundles.push(argv[i + 1]);
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

  if (!args.name || !args.skillMd) throw new Error(usage());
  if (args.bundles.some((bundle) => !bundle)) throw new Error("--bundle requires <src>:<dest-subdir>");
  return args;
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function assertFile(path, label) {
  const info = await stat(path).catch((error) => {
    if (error?.code === "ENOENT") throw new Error(`${label} not found: ${path}`);
    throw error;
  });
  if (!info.isFile()) throw new Error(`${label} is not a file: ${path}`);
}

function assertInside(parent, child, label) {
  const root = resolve(parent);
  const target = resolve(child);
  if (target !== root && !target.startsWith(`${root}/`)) {
    throw new Error(`${label} must stay inside the skill directory: ${child}`);
  }
}

async function copyBundle(spec, target) {
  const separatorIndex = spec.indexOf(":");
  if (separatorIndex === -1) {
    throw new Error(`--bundle expects <src>:<dest-subdir>, got: ${spec}`);
  }

  const src = resolve(spec.slice(0, separatorIndex));
  const destSubdir = spec.slice(separatorIndex + 1);
  const destDir = resolve(target, destSubdir);
  assertInside(target, destDir, "Bundle destination");

  const info = await stat(src).catch((error) => {
    if (error?.code === "ENOENT") throw new Error(`Bundle source not found: ${src}`);
    throw error;
  });

  await mkdir(destDir, { recursive: true });
  await cp(src, resolve(destDir, basename(src)), {
    recursive: info.isDirectory(),
    force: true,
    errorOnExist: false,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!SKILL_NAME_RE.test(args.name)) {
    throw new Error(`Skill name '${args.name}' must be lowercase kebab-case (a-z, 0-9, hyphens).`);
  }

  const skillMd = resolve(args.skillMd);
  await assertFile(skillMd, "SKILL.md");

  const target = resolve(SKILLS_ROOT, args.name);
  if ((await pathExists(target)) && !args.force) {
    throw new Error(`Skill already exists at ${target}. Use --force to overwrite.`);
  }

  await mkdir(target, { recursive: true });
  await cp(skillMd, resolve(target, "SKILL.md"), { force: true });
  for (const bundle of args.bundles) {
    await copyBundle(bundle, target);
  }

  console.log(target);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
