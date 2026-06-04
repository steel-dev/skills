// ABOUTME: Seeds one real, deterministically-failed Steel session for the testbench chain.
// ABOUTME: Drives a wrong-credentials login, then writes runs/_fixtures.json for downstream tasks.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The chain's downstream skills (steel-session-debugging, steel-reliability, steel-recording) need a
// real session that actually failed, so their diagnostics have genuine logs/traces/recording to read.
// the-internet.herokuapp.com/login is a purpose-built deterministic login: any wrong credential pair
// is rejected with a visible "Your username is invalid!" flash and no redirect to the secure area.
// (quotes.toscrape.com is unusable here — it accepts ANY credentials, so a login can never fail.)
const LOGIN_URL = "https://the-internet.herokuapp.com/login";
const FAILURE_MARKER = "Your username is invalid!";
const BOGUS_USER = "bogus_user";
const BOGUS_PASS = "wrong_password";

const here = dirname(fileURLToPath(import.meta.url));
const defaultOut = resolve(here, "..", "runs", "_fixtures.json");

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : def;
}

// Run a steel CLI command, parse its {data,success} envelope, and fail loudly on a non-success result.
function steel(args, { raw = false } = {}) {
  const out = execFileSync("steel", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (raw) return out;
  let parsed;
  try { parsed = JSON.parse(out); } catch { throw new Error(`steel ${args.join(" ")}: non-JSON output`); }
  if (parsed.success === false) throw new Error(`steel ${args.join(" ")}: ${JSON.stringify(parsed.error ?? parsed)}`);
  return parsed.data ?? parsed;
}

const outFile = resolve(arg("out", defaultOut));
// A unique name avoids re-attaching to a stale session from a previous matrix run.
const sessionName = arg("name", `seed-login-fail-${Date.now()}`);

let sessionId = null;
try {
  // inactivity-timeout 0 keeps the session alive through the multi-step flow regardless of pauses.
  const started = steel(["browser", "start", "--json", "--session", sessionName, "--inactivity-timeout", "0"]);
  sessionId = started.id;
  if (!sessionId) throw new Error("browser start returned no session id");
  console.log(`▶ seed session ${sessionId} (${sessionName})`);

  steel(["browser", "navigate", "--session", sessionName, LOGIN_URL, "--json"]);
  steel(["browser", "fill", "--session", sessionName, "#username", BOGUS_USER, "--json"]);
  steel(["browser", "fill", "--session", sessionName, "#password", BOGUS_PASS, "--json"]);
  steel(["browser", "click", "--session", sessionName, "button[type=submit]", "--json"]);

  // Confirm the failure actually rendered — a seed that silently "succeeded" would poison the chain.
  const content = steel(["browser", "content", "--session", sessionName], { raw: true });
  if (!content.includes(FAILURE_MARKER)) {
    throw new Error(`expected login failure marker "${FAILURE_MARKER}" not found; seed scenario broke`);
  }
  console.log(`  ✓ login rejected as expected ("${FAILURE_MARKER}")`);
} finally {
  // Logs/traces/recording persist after release, so downstream tasks can read them minutes later.
  if (sessionId) {
    try { steel(["sessions", "release", sessionId, "--json"]); console.log("  ✓ released"); }
    catch (e) { console.error(`  ! release failed: ${e.message}`); }
  }
}

const fixtures = {
  session_id: sessionId,
  scenario: "login-failure",
  login_url: LOGIN_URL,
  failure_marker: FAILURE_MARKER,
  bogus_username: BOGUS_USER,
  created_at: new Date().toISOString(),
};
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(fixtures, null, 2) + "\n");
console.log(`  ✓ wrote ${outFile}`);
