#!/usr/bin/env node
// ABOUTME: Generate .claude-plugin/marketplace.json from manifest.json so the two never drift.
// ABOUTME: Default writes the file; --check verifies the committed file is up to date (for CI).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const MANIFEST = resolve(ROOT, "manifest.json");
const OUTPUT = resolve(ROOT, ".claude-plugin", "marketplace.json");

// Marketplace identity. The `name` is what users reference as <plugin>@<name>.
const MARKETPLACE_NAME = "steel-skills";
const OWNER = { name: "Steel", url: "https://steel.dev" };
const SCHEMA = "https://json.schemastore.org/claude-code-marketplace.json";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

// Turn one manifest skill entry into a marketplace plugin entry.
function toPlugin(name, meta) {
  return {
    name,
    source: `./${meta.path ?? name}`,
    description: meta.description,
    version: meta.version,
    category: meta.category,
    license: "MIT",
    keywords: unique(["steel", ...(meta.platform_features ?? [])]),
    homepage: meta.docs_url,
  };
}

function buildMarketplace(manifest) {
  return {
    $schema: SCHEMA,
    name: MARKETPLACE_NAME,
    owner: OWNER,
    metadata: {
      description:
        "Official agent skills for Steel cloud browsers: live web automation, SDK development, session debugging, reliability, and skill authoring.",
      version: manifest.version,
    },
    plugins: Object.entries(manifest.skills).map(([name, meta]) => toPlugin(name, meta)),
  };
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function main() {
  const check = process.argv.includes("--check");
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  if (!manifest.skills || typeof manifest.skills !== "object") {
    throw new Error("manifest.skills is required");
  }

  const generated = serialize(buildMarketplace(manifest));

  if (check) {
    let current = null;
    try {
      current = await readFile(OUTPUT, "utf8");
    } catch {
      throw new Error("marketplace.json is missing; run: node scripts/generate-marketplace.mjs");
    }
    if (current !== generated) {
      throw new Error("marketplace.json is out of date; run: node scripts/generate-marketplace.mjs");
    }
    console.log(`OK: marketplace.json matches manifest (${Object.keys(manifest.skills).length} plugins)`);
    return;
  }

  await mkdir(resolve(ROOT, ".claude-plugin"), { recursive: true });
  await writeFile(OUTPUT, generated);
  console.log(`Wrote ${Object.keys(manifest.skills).length} plugins to .claude-plugin/marketplace.json`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
