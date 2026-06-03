# Fidelity rubric for the verification pass

Use this when judging whether a generated skill works. You have:
- Trace #1 (your first run, with the user's example inputs)
- Trace #2 (your second run, with mutated inputs)
- Trace #3 (the verification run by invoking the freshly-installed skill on a *third* input set)
- The generated skill source
- The inputs passed to trace #3 and the output the skill returned

Do not run a structural diff. Form a judgment. The goal is "did the skill achieve the user's intent on new inputs", not "did every event match position-by-position".

## Criteria, in order of importance

### 1. Success signal reached

The most important question: did trace #3 end in the same kind of state as traces #1 and #2?

- A price was extracted and looks plausible.
- A confirmation page was reached.
- A file was downloaded.
- A form submission was acknowledged.
- The expected element appeared on the final page.

If yes: this dominates. The skill works on the new inputs.
If no: nothing below matters until this is fixed. Go figure out why.

### 2. Parameter substitution clean

Did the third inputs show up in the right places? Easiest checks:
- Search for the new input values as strings in trace #3's URLs and DOM. They should appear where the corresponding old values appeared in trace #1.
- If a parameter was supposed to template into a URL and didn't, the skill has a parameterization bug.
- If a parameter shows up in trace #3 but in the *wrong* position (e.g., destination swapped with origin), the skill mapped the parameters incorrectly.

### 3. Wait points held up

Did the generated skill wait for the right things? Signs of failure:
- Steps that tried to interact with an element before it existed (you'd see this as a timeout or a missing-element error).
- Long idle gaps in trace #3 that weren't present in trace #1 (the skill waited for the wrong thing or used the wrong timeout).
- Race conditions: a click that succeeded but didn't have the expected effect because the page wasn't ready.

### 4. Extra steps handled gracefully

A new modal, cookie banner, or "rate this experience" popup that wasn't in trace #1 may have appeared in trace #3. Did the skill handle it, fail because of it, or finish anyway by accident?

- Handled it: good. Note that the skill picked up a real-world adaptation.
- Failed because of it: the skill needs to learn to dismiss unknown overlays. Suggest adding a generic "dismiss non-essential modals before key interactions" step.
- Finished anyway: fine, but flag it — next time it might not.

### 5. Skipped steps explained

If trace #3 is materially shorter than traces #1 and #2, ask:
- Did the skill find a shortcut that achieves the goal in fewer steps? Fine.
- Did the skill skip a step that was actually needed, and only got away with it because of cached state? Risky — flag for the user.
- Did the skill bail out early after a failed step? Failure. Go back to criterion 1.

### 6. Unexpected state handled via the right Steel primitive

If a CAPTCHA appeared in trace #3 that wasn't in trace #1, did the skill solve it (via `solve_captcha: true`) or crash?
If a login wall appeared, did the skill use the credentials vault or stop with a helpful error?

The right answer here is "the skill picked the right Steel primitive". The wrong answer is "the skill tried to type the password directly into the form" or "the skill ignored the CAPTCHA".

## Output format for your verdict

Tell the user a short verdict. Three components:

1. **Pass / Mixed / Fail** — your overall call.
2. **Evidence** — one or two specific things that pushed you toward that call (a quote from the trace, a value that came back, a step that didn't work).
3. **Recommended action** — for Mixed/Fail, what to change. For Pass, nothing — just say it's installed and how to invoke it.

Example of a good verdict:

> **Pass.** Trace #3 returned `cheapest_direct_usd: 134.50` for the JFK→LAX route on the dates you asked for, and the new dates appeared in the URL exactly where they should have. The flow was 9 steps, same as the originals. Cookie banner from trace #1 didn't appear in trace #3 — Booking.com probably remembers consent across sessions in stealth mode, no action needed. Skill is installed at `~/.claude/skills/flight-price-probe/`. Invoke with the four parameters listed in its description.

Example of a useful Mixed verdict:

> **Mixed.** Trace #3 reached the results page and read a price (`$220.00`), but the price is for a 1-stop flight, not direct. The selector for the "Direct only" radio button didn't engage in trace #3 — looks like the button moved positions and the skill clicked the wrong row. Recommend revising the click step to identify the radio by its accessible name ("Direct only") rather than by position. Want me to revise and rerun?

Be concise. The user doesn't want a graded essay — they want to know if the skill works and what to do next.
