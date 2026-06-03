#!/usr/bin/env node
// ABOUTME: Collect Steel session diagnostics into .steel-debug/<session-id>/bundle.json.
// ABOUTME: Uses the Steel CLI first and writes local artifacts for redaction/summarization.

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function usage() {
  return "Usage: node scripts/collect-session-debug.mjs <session-id> [--out .steel-debug]";
}

function parseArgs(argv) {
  const args = { sessionId: undefined, out: ".steel-debug" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    } else if (!args.sessionId) {
      args.sessionId = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  if (!args.sessionId) throw new Error(usage());
  return args;
}

async function steelJson(args) {
  try {
    const { stdout } = await execFileAsync("steel", ["--json", ...args], {
      maxBuffer: 20 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (error) {
    return {
      error: error.message,
      stderr: error.stderr?.toString(),
      stdout: error.stdout?.toString(),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetDir = resolve(args.out, args.sessionId);
  await mkdir(targetDir, { recursive: true });

  const [metadata, browserLogs, agentLogs, agentTraces] = await Promise.all([
    steelJson(["sessions", "get", args.sessionId]),
    steelJson(["sessions", "logs", args.sessionId]),
    steelJson(["sessions", "agent-logs", args.sessionId]),
    steelJson(["sessions", "traces", args.sessionId]),
  ]);

  const bundle = {
    collectedAt: new Date().toISOString(),
    sessionId: args.sessionId,
    metadata,
    browserLogs,
    agentLogs,
    agentTraces,
  };

  const outputPath = resolve(targetDir, "bundle.json");
  await writeFile(outputPath, JSON.stringify(bundle, null, 2));
  console.log(outputPath);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
