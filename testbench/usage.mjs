// ABOUTME: Extracts token usage + USD cost from each agent's transcript/stdout (shapes differ).
// ABOUTME: Returns { input, output, cost_usd } with nulls where an agent doesn't report a value.

const EMPTY = { input: null, output: null, cost_usd: null };

function parseLines(text) {
  return (text || "")
    .split("\n")
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

// Recursively collect every object satisfying pred (handles nested event shapes).
function collect(obj, pred, out = []) {
  if (obj && typeof obj === "object") {
    if (pred(obj)) out.push(obj);
    for (const k of Object.keys(obj)) collect(obj[k], pred, out);
  }
  return out;
}

export function extractUsage(agent, { stdout = "", transcript = "" } = {}) {
  try {
    if (agent === "claude") {
      // stdout is a single result JSON: total_cost_usd + usage.{input,output}_tokens
      const o = JSON.parse(stdout);
      return {
        input: o.usage?.input_tokens ?? null,
        output: o.usage?.output_tokens ?? null,
        cost_usd: o.total_cost_usd ?? null,
      };
    }

    const lines = parseLines(transcript);

    if (agent === "codex") {
      // events carry .usage = { input_tokens, output_tokens, cached_input_tokens }; take the last
      // (codex reports cumulative per turn). No per-call cost on token plans.
      const usages = collect({ lines }, (o) => typeof o.input_tokens === "number" && "output_tokens" in o);
      const last = usages[usages.length - 1];
      return last ? { input: last.input_tokens ?? null, output: last.output_tokens ?? null, cost_usd: null } : EMPTY;
    }

    if (agent === "opencode") {
      // step_finish events: per-step .cost (number) + .tokens.{input,output}; sum across steps.
      const steps = collect({ lines }, (o) => typeof o.cost === "number" && o.tokens && typeof o.tokens === "object");
      if (!steps.length) return EMPTY;
      let cost = 0, input = 0, output = 0;
      for (const s of steps) { cost += s.cost || 0; input += s.tokens.input || 0; output += s.tokens.output || 0; }
      return { input, output, cost_usd: cost };
    }

    if (agent === "pi") {
      // per-message .usage = { input, output, ..., cost: { total } }; sum across messages.
      const usages = collect({ lines }, (o) => o.cost && typeof o.cost.total === "number" && typeof o.input === "number");
      if (!usages.length) return EMPTY;
      let cost = 0, input = 0, output = 0;
      for (const u of usages) { cost += u.cost.total || 0; input += u.input || 0; output += u.output || 0; }
      return { input, output, cost_usd: cost };
    }
  } catch { /* fall through */ }
  return EMPTY;
}
