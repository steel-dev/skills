// ABOUTME: Queries the Steel API for browser sessions created during a run's time window.
// ABOUTME: Returns count + total duration/credits/proxy bytes — a direct proxy for run cost.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function steelKey() {
  try {
    return JSON.parse(readFileSync(join(homedir(), ".config", "steel", "config.json"), "utf8")).apiKey || null;
  } catch { return null; }
}

// Sessions are global to the Steel account; attribution assumes runs execute sequentially (they
// do in this harness). Other concurrent Steel activity in the window would be misattributed.
export async function fetchSteelSessions({ sinceMs, untilMs, limit = 100 }) {
  const key = steelKey();
  if (!key) return { available: false, reason: "no steel api key" };
  try {
    const res = await fetch(`https://api.steel.dev/v1/sessions?limit=${limit}`, {
      headers: { "Steel-Api-Key": key },
    });
    if (!res.ok) return { available: false, reason: `http ${res.status}` };
    const body = await res.json();
    const all = Array.isArray(body) ? body : (body.sessions || []);
    const inWindow = all.filter((s) => {
      const t = Date.parse(s.createdAt);
      return Number.isFinite(t) && t >= sinceMs && t <= untilMs;
    });
    const sum = (f) => inWindow.reduce((a, s) => a + (s[f] || 0), 0);
    return {
      available: true,
      count: inWindow.length,
      total_duration_ms: sum("duration"),
      total_credits: sum("creditsUsed"),
      total_proxy_bytes: sum("proxyBytesUsed"),
      ids: inWindow.map((s) => s.id),
    };
  } catch (e) { return { available: false, reason: e.message }; }
}
