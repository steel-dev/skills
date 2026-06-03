#!/usr/bin/env node
// ABOUTME: Summarize a redacted Steel session debug bundle into a compact markdown report.
// ABOUTME: This is deterministic triage, not an LLM diagnosis.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

function usage() {
  return "Usage: node scripts/summarize-session-debug.mjs <redacted-bundle.json> [--out summary.md]";
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

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.logs)) return value.logs;
  if (Array.isArray(value?.traces)) return value.traces;
  return [];
}

function textOf(value) {
  try {
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch {
    return "";
  }
}

function findSignals(bundle) {
  const haystack = textOf(bundle).toLowerCase();
  const signals = [];
  for (const [label, needles] of [
    ["auth", ["401", "unauthorized", "login", "sign in"]],
    ["access denied", ["403", "access denied", "forbidden"]],
    ["captcha", ["captcha", "hcaptcha", "recaptcha", "turnstile"]],
    ["proxy", ["proxy", "tunnel", "err_tunnel_connection_failed"]],
    ["timeout", ["timeout", "timed out", "navigation timeout"]],
    ["network", ["net::", "failed request", "5xx", "502", "503"]],
  ]) {
    if (needles.some((needle) => haystack.includes(needle))) signals.push(label);
  }
  return signals;
}

function formatReport(bundle) {
  const logs = asArray(bundle.browserLogs);
  const agentLogs = asArray(bundle.agentLogs);
  const traces = asArray(bundle.agentTraces);
  const signals = findSignals(bundle);

  return [
    `# Steel Session Debug Summary`,
    "",
    `Session: \`${bundle.sessionId ?? "unknown"}\``,
    `Collected: ${bundle.collectedAt ?? "unknown"}`,
    "",
    "## Available Evidence",
    "",
    `- Browser log entries: ${logs.length}`,
    `- Raw agent log entries: ${agentLogs.length}`,
    `- Agent trace entries: ${traces.length}`,
    `- Detected signals: ${signals.length ? signals.join(", ") : "none from deterministic scan"}`,
    "",
    "## Next Manual Review",
    "",
    "- Read the last navigation/action in `agentTraces`.",
    "- Check browser logs for errors at the same timestamp.",
    "- Check whether detected signals require `steel-reliability`.",
    "- Produce the diagnosis using the skill output format.",
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolve(args.input);
  const outputPath = args.out ? resolve(args.out) : resolve(dirname(inputPath), "summary.md");
  const bundle = JSON.parse(await readFile(inputPath, "utf8"));
  const report = formatReport(bundle);
  await writeFile(outputPath, report);
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
