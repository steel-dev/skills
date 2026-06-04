#!/usr/bin/env node
// ABOUTME: Generate Codex plugin artifacts (.codex-plugin/plugin.json per skill + .agents/plugins/marketplace.json) from manifest.json.
// ABOUTME: Default writes the files; --check verifies the committed files are up to date (for CI). Keeps manifest.json the single source of truth.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MANIFEST = resolve(ROOT, "manifest.json");
const CATALOG = resolve(ROOT, ".agents", "plugins", "marketplace.json");

// Marketplace identity. `name` is what `codex plugin marketplace` references.
const MARKETPLACE_NAME = "steel-skills";
const DISPLAY_NAME = "Steel Skills";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

// One .codex-plugin/plugin.json per skill. SKILL.md lives at the skill-dir root,
// so the plugin's skills directory is the dir itself ("./").
function toPluginManifest(name, meta) {
  return {
    name,
    version: meta.version,
    description: meta.description,
    license: "MIT",
    homepage: meta.docs_url,
    keywords: unique(["steel", ...(meta.platform_features ?? [])]),
    skills: "./",
  };
}

// One entry per skill in the Codex marketplace catalog.
function toCatalogEntry(name, meta) {
  return {
    name,
    source: { source: "local", path: `./${meta.path ?? name}` },
    policy: { installation: "AVAILABLE" },
    category: meta.category,
  };
}

function buildCatalog(manifest) {
  return {
    name: MARKETPLACE_NAME,
    interface: { displayName: DISPLAY_NAME },
    plugins: Object.entries(manifest.skills).map(([name, meta]) => toCatalogEntry(name, meta)),
  };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

// Every file this generator owns: the catalog plus one manifest per skill.
function artifacts(manifest) {
  const files = [[CATALOG, serialize(buildCatalog(manifest))]];
  for (const [name, meta] of Object.entries(manifest.skills)) {
    const path = resolve(ROOT, meta.path ?? name, ".codex-plugin", "plugin.json");
    files.push([path, serialize(toPluginManifest(name, meta))]);
  }
  return files;
}

async function main() {
  const check = process.argv.includes("--check");
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  if (!manifest.skills || typeof manifest.skills !== "object") {
    throw new Error("manifest.skills is required");
  }

  const files = artifacts(manifest);

  if (check) {
    const stale = [];
    for (const [path, content] of files) {
      let current = null;
      try {
        current = await readFile(path, "utf8");
      } catch {
        stale.push(path);
        continue;
      }
      if (current !== content) stale.push(path);
    }
    if (stale.length) {
      throw new Error(
        `Codex artifacts out of date; run: node scripts/generate-codex.mjs\n  ${stale.map((p) => resolve(p).replace(`${ROOT}/`, "")).join("\n  ")}`,
      );
    }
    console.log(`OK: Codex artifacts match manifest (${files.length} files)`);
    return;
  }

  for (const [path, content] of files) {
    await mkdir(resolve(path, ".."), { recursive: true });
    await writeFile(path, content);
  }
  console.log(`Wrote ${files.length} Codex artifacts (1 catalog + ${files.length - 1} plugin manifests)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
