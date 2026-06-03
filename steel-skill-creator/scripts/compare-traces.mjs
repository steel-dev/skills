#!/usr/bin/env node
// ABOUTME: Produce a lightweight comparison summary for two Steel agent trace JSON files.
// ABOUTME: Intended as a guide for human/agent reasoning, not an automatic parameter extractor.

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function usage() {
  return "Usage: node scripts/compare-traces.mjs <trace-a.json> <trace-b.json> [--out comparison.json]";
}

function parseArgs(argv) {
  const args = { a: undefined, b: undefined, out: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--out") {
      args.out = argv[i + 1];
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      console.log(usage());
      process.exit(0);
    } else if (!args.a) {
      args.a = arg;
    } else if (!args.b) {
      args.b = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  if (!args.a || !args.b) throw new Error(usage());
  return args;
}

function events(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.events)) return data.events;
  if (Array.isArray(data?.traces)) return data.traces;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function summarize(event) {
  return {
    type: event.type ?? event.eventType ?? event.name ?? event.action,
    url: event.url ?? event.pageUrl ?? event.page?.url,
    label: event.accessibleName ?? event.label ?? event.target?.accessibleName,
    selector: event.selector ?? event.target?.selector,
    value: event.value ?? event.inputValue ?? event.text,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const left = events(JSON.parse(await readFile(resolve(args.a), "utf8"))).map(summarize);
  const right = events(JSON.parse(await readFile(resolve(args.b), "utf8"))).map(summarize);
  const pairs = [];
  const max = Math.max(left.length, right.length);

  for (let index = 0; index < max; index += 1) {
    const a = left[index] ?? null;
    const b = right[index] ?? null;
    pairs.push({
      index,
      a,
      b,
      sameType: a?.type === b?.type,
      changedFields: a && b ? Object.keys(a).filter((key) => a[key] !== b[key]) : ["missing-event"],
    });
  }

  const summary = {
    traceAEvents: left.length,
    traceBEvents: right.length,
    likelyParameters: pairs.filter((pair) => pair.sameType && pair.changedFields.some((field) => ["url", "label", "value"].includes(field))),
    divergentSteps: pairs.filter((pair) => !pair.sameType || pair.changedFields.includes("missing-event")),
  };

  const output = { summary, pairs };
  if (args.out) {
    await writeFile(resolve(args.out), JSON.stringify(output, null, 2));
    console.log(resolve(args.out));
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
