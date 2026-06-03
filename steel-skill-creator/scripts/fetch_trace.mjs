#!/usr/bin/env node
// ABOUTME: Fetch a Steel session's semantic agent trace via the Steel CLI.
// ABOUTME: Writes normalized trace JSON to a temp file and prints the path.

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

function usage() {
  return "Usage: node scripts/fetch_trace.mjs <session-id> [--out <path>]";
}

function parseArgs(argv) {
  const args = { sessionId: undefined, out: undefined };
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
  if (args.out === undefined && argv.includes("--out")) {
    throw new Error("--out requires a path");
  }
  return args;
}

function fetchTrace(sessionId) {
  const cmd = ["--json", "sessions", "traces", sessionId];
  const result = spawnSync("steel", cmd, { encoding: "utf8" });

  if (result.error?.code === "ENOENT") {
    throw new Error(
      "steel CLI is not installed or not on PATH. Install with: curl -fsS https://setup.steel.dev | sh",
    );
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
    throw new Error(`Failed to fetch trace with \`steel ${cmd.join(" ")}\`: ${detail}`);
  }

  let payload;
  try {
    payload = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(`steel CLI returned non-JSON output: ${error.message}`);
  }

  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.events)) return data.events;
  if (data && typeof data === "object") return [data];
  return [];
}

async function main() {
  const { sessionId, out } = parseArgs(process.argv.slice(2));
  const events = fetchTrace(sessionId);

  if (events.length === 0) {
    throw new Error(
      `Trace for session ${sessionId} is empty. This is either a legacy CDP-only session or the session has no recorded activity.`,
    );
  }

  const payload = { session_id: sessionId, event_count: events.length, events };
  const outPath =
    out ??
    join(await mkdtemp(join(tmpdir(), `trace-${sessionId.slice(0, 8)}-`)), "trace.json");

  await writeFile(resolve(outPath), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(resolve(outPath));
  console.error(`# ${events.length} events`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
