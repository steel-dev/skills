---
name: steel-skill-creator
description: Use this skill when the user wants to turn a recurring browser workflow into a reusable, parameterized agent skill, especially when the task has concrete inputs and a clear output such as scheduled scrapes, form submissions, data extraction, monitoring flows, price probes, or login-gated reports. Do not use for one-off web tasks; use steel-browser.
license: MIT
compatibility: claude-code,codex,cursor,opencode,pi
metadata:
  owner: steel
  category: create
  stage: beta
---

# Steel Skill Creator

Turn a recurring web task into an agent skill. The user describes the task and one set of example inputs. You drive the task end-to-end twice in a real Steel browser (once with the example inputs, once with mutated inputs), capture both traces through the Steel CLI, author a parameterized SKILL.md, install it, and verify it on a third input set.

The user does not provide a session ID. You generate both sessions yourself.

## The principle this skill is built on

Steel agent traces are already 80% of a SKILL.md. They contain stable selectors prioritized by quality (testId → id → aria → name → CSS), accessibleNames for every clicked element, page boundaries, idle gaps that mark wait points, and parameter values inline as URL query strings and form inputs. Your job is mostly **reading two traces side by side and writing the parts that aren't there yet**: the goal, the parameter names, the success criteria, and the right Steel session configuration (stealth, proxy, credentials, profiles) for production replay.

The reason you generate *both* traces yourself: parameter extraction is reliable when you can diff two runs of the same flow with different inputs. Anything that differs at corresponding positions is a parameter; anything identical is an invariant. You can't get that from a single trace without guessing, and asking the user to record twice doubles their effort. Better that you do it.

Do not try to handle every edge case programmatically. Use your judgment. The references/ directory tells you what to look for; the rest is reading code and writing code.

## Prerequisites

- `steel` CLI is installed and authenticated for browser driving.
- The `steel-browser` skill is available — you'll use the same primitives (`steel browser start`, `navigate`, `snapshot`, `click`, `fill`, `wait`, etc.) to drive both recording sessions.
- The task is described clearly enough that you can execute it. If the description is too vague ("automate my browsing"), ask for specifics before doing anything else.

## Workflow

### Step 1 — Gather task description and example inputs

You need three things from the user:

1. **Skill name** — a kebab-case identifier (e.g., `flight-price-probe`, `weekly-traffic-report`). If the user has not given one, propose one based on what the flow does and confirm.
2. **One-line goal** — what the skill is for, in the user's own words ("find cheapest direct flight between two airports on a given date range"). This becomes the basis of the generated skill's description.
3. **One set of example inputs** — concrete values that exercise the full flow. Not "search for flights"; "search SPU → FCO, depart 2026-06-13, return 2026-06-18". Be specific enough that you can actually execute the task without asking again.

If anything is missing or ambiguous, ask once, concisely. Don't drag the user through a long Q&A.

### Step 2 — Confirm safety before recording

Before running the task even once, think about side effects:

- **Read-only flow** (scraping, searching, reading reports, price lookups) → safe to run twice with different inputs. Proceed.
- **Side-effect flow** (booking, paying, sending messages, submitting forms that trigger emails or charges, creating accounts, posting content) → **stop and ask.** Running this twice with arbitrary inputs could cost money, spam someone, or create real-world artifacts. Offer the user three options:
  1. Use sandbox/test accounts/inputs for both runs.
  2. Record once only, accept lower-quality parameterization (the generated skill will have to guess some parameters from heuristics rather than diff evidence), and clearly mark the skill as "single-trace draft" in its description.
  3. Abandon the automation here and describe the steps in plain English as documentation rather than an executable skill.

Never silently run a side-effect flow twice. The user's trust is more important than the skill.

### Step 3 — Record trace #1 by driving the task yourself

Use the steel-browser primitives to perform the task end-to-end with the example inputs from step 1. Start a session (with the right configuration per `references/steel-primitives.md`), navigate, click, wait, extract — exactly the same patterns you'd use if you were running `/steel-browser` for the user.

Take screenshots and snapshots along the way to verify each step worked. If a step fails, debug it like you would in any normal Steel session — don't push through a broken state.

When the task reaches its success state (the data is extracted, the form is submitted, the confirmation page renders), stop the session. **Save the session ID** — you'll need it in step 5.

### Step 4 — Record trace #2 by replaying with mutated inputs

Pick mutated inputs. For each example value from step 1, choose a sensible alternative that exercises the same flow:

- Date → different date in the same or adjacent month.
- Search term → semantically different but well-formed (different airport, different product category, different person's name).
- IDs → a different known-good ID.

Aim for *different inputs, same intent*. The goal is a trace that takes the same conceptual path so the diff isolates parameters cleanly.

Run the task again in a fresh Steel session using the mutated inputs. Same configuration, same starting URL, same logical sequence of actions.

**If trace #2 diverges from trace #1** — hits a login wall trace #1 didn't, encounters a CAPTCHA, lands on a structurally different page — stop and investigate. Consult `references/steel-primitives.md` to decide whether to add Steel session options (stealth, proxy, captcha solving) or whether to escalate to the user. Do not paper over the divergence.

Save the second session ID.

### Step 5 — Fetch both traces

```bash
node scripts/fetch_trace.mjs <session-id-1>
node scripts/fetch_trace.mjs <session-id-2>
```

The script calls `steel --json sessions traces <session-id>`, writes the normalized trace JSON to a temp file, and prints the path. The trace has events with `accessibleName`, selectors, page URLs, value fields, and timestamps — see `references/trace-anatomy.md` for what to look at.

### Step 6 — Author the generated skill

You now have two traces. Read them together. The differences at corresponding positions are the **parameters**; the similarities are the **invariants**.

Consult these references in order:
- `references/trace-anatomy.md` — how to read each event and how to align two traces.
- `references/steel-primitives.md` — the decision tree for credentials, profiles, stealth, proxy, and CAPTCHA. This determines how the generated skill creates its Steel session.
- `references/skill-template.md` — the scaffold to fill in.

The generated skill depends on the `steel-browser` skill at runtime — it does not embed CLI commands inline. Every generated skill must include a `## Prerequisites` section (the template shows the exact wording) that points the user at `curl -fsS https://setup.steel.dev | sh`, which installs the steel CLI and the steel-browser skill. The body steps then describe intent in plain prose, with element names in italics; the executor translates that into `snapshot → click → fill → wait` sequences using steel-browser's primitives.

Selector choice for the generated skill, in priority order:
1. Element text or accessibleName (most resilient — survives most DOM rewrites).
2. `data-testid` if present.
3. `id` if present and looks intentional.
4. `aria-label` or `name`.
5. CSS selectors as a last resort, never `:nth-of-type` chains unless nothing else exists.

Use `target.selector` as evidence for available selectors, but prefer a readable semantic step when the accessible name is specific enough. For example, write "Click the *Direct only* checkbox" instead of exposing a raw selector.

Name parameters by what they *mean*, not what they *are*. `depart_date`, not `param_2`. The model that will later use the generated skill is reading these names cold; clarity matters.

Write the goal in the imperative ("Find the cheapest direct round-trip price for {origin} → {destination} between {depart} and {return}"). Write success criteria in terms of *what gets returned*, not what gets clicked.

### Step 7 — Install the skill

```bash
node scripts/install_skill.mjs <skill-name> --skill-md <path-to-generated-SKILL.md>
```

The script writes to `~/.claude/skills/<skill-name>/` and tells you the final path. Generated skills go system-wide by default so the user can invoke them from any project.

### Step 8 — Verify by running the new skill

Pick a *third* set of inputs — distinct from both step 1 (example inputs) and step 4 (mutated inputs). Invoke the freshly-installed skill against those inputs in a fresh Steel session. Capture the resulting session ID, fetch trace #3.

### Step 9 — Judge fidelity

Read `references/llm-judge-rubric.md`. With the three traces, the generated skill source, and the inputs/outputs you've gathered, form a verdict:
- Did trace #3 reach the same kind of success signal as traces #1 and #2?
- Did the third inputs substitute cleanly into URLs and form values?
- Were extra steps (cookie banners, modals) handled or did they break things?
- Were any steps skipped, and if so, did that matter?

Do not run a structural diff. Form a judgment.

If the verdict is good: tell the user the skill is installed, where, and show one example invocation with concrete inputs.

If the verdict is mixed: show the user the diagnosis in plain English and offer to revise — usually the fix is one of: a wait point in the wrong place, a selector that was too specific, a parameter that should have been split into two, or a Steel session option that was missed.

## Decision points: when to ask the user vs. proceed

Ask the user when:

- The task description is vague enough that you'd have to invent the inputs (step 1).
- The task has side effects you can't safely replay twice (step 2).
- The first run hits a login flow on a site Steel credentials are not configured for. You need consent before storing credentials in the vault.
- The replay in step 4 hits a CAPTCHA on a site the user is not on a paid Steel plan for, or a geo-block requiring a region they haven't authorized.
- You cannot tell from the two traces whether something was a deliberate parameter or accidental noise (e.g., did the user scroll to position 437px on purpose, or was that incidental?).

Proceed without asking when:

- Selector choice — use your judgment from the priority list.
- Parameter naming — propose names, the user will rename them later if they want.
- Wait point placement — idle gaps + page transitions are reliable signals.
- Mutated input choice in step 4 — pick something reasonable and move on.
- Whether to enable stealth/proxy/CAPTCHA on the generated skill — the decision tree in `references/steel-primitives.md` is unambiguous.

## What to avoid

- **Do not regex over trace JSON looking for parameters.** Read the traces; reason about them. Two-trace diff is a mental operation, not a string-comparison operation.
- **Do not include trace IDs, session IDs, or timestamps in the generated skill.** Those are artifacts of *this* compilation; they don't belong in the reusable skill.
- **Do not write a hundred-line SKILL.md.** Generated skills should be lean — 40–80 lines of body. The Steel trace is the source code; the SKILL.md is the abstract.
- **Do not invent steps that weren't in either trace.** If neither recording included "dismiss the cookie banner", the generated skill shouldn't pretend it did. If a banner shows up later in production, the verification pass will catch it.
- **Do not run a side-effect flow twice without user consent.** This bears repeating.

## Output

A successful run leaves the user with:

- A new skill at `~/.claude/skills/<skill-name>/`.
- An example invocation they can copy-paste.
- A short note on any caveats (e.g., "requires Steel credentials for foo.com to be configured; run `steel credentials create --origin https://foo.com` once before first use").
- A one-line fidelity verdict from the verification pass.
