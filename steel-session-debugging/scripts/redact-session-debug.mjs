#!/usr/bin/env node
// ABOUTME: Redact sensitive values from a Steel session debug bundle.
// ABOUTME: Writes redacted-bundle.json next to the input file unless --out is provided.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SENSITIVE_KEY_RE = /api[_-]?key|authorization|cookie|set-cookie|password|passwd|secret|token|totp|credential|sessioncontext|email|username/i;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const STEEL_KEY_RE = /\bsk_[A-Za-z0-9_=-]{12,}\b/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const COOKIE_RE = /\b(?:__cf_bm|_session|session|sid|auth|token)=([^;\s]+)/gi;

function usage() {
  return "Usage: node scripts/redact-session-debug.mjs <bundle.json> [--out redacted-bundle.json]";
}

function parseArgs(argv) {
  const args = { input: undefined, out: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    } else if (!args.input) {
      args.input = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  if (!args.input) throw new Error(usage());
  return args;
}

function redactString(value) {
  return value
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(STEEL_KEY_RE, "[REDACTED_STEEL_API_KEY]")
    .replace(EMAIL_RE, "[REDACTED_EMAIL]")
    .replace(COOKIE_RE, (match) => `${match.split("=")[0]}=[REDACTED]`);
}

function redact(value, key = "") {
  if (SENSITIVE_KEY_RE.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redact(childValue, childKey)]));
  }
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(args.input);
  const outputPath = args.out ? resolve(args.out) : resolve(dirname(inputPath), "redacted-bundle.json");
  const raw = await readFile(inputPath, "utf8");
  const data = JSON.parse(raw);
  await writeFile(outputPath, JSON.stringify(redact(data), null, 2));
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
