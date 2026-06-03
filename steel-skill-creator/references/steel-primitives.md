# Choosing the right Steel primitives for the generated skill

Use this decision tree when authoring the generated skill's session-creation step. Match what you saw in the trace to the right Steel feature; do not over-configure (every extra option is a thing that can break or cost money) and do not under-configure (a skill that breaks the first time a real CAPTCHA appears is worse than no skill).

## Quick reference

| Signal | Steel primitive | Plan |
|---|---|---|
| Target domain is on the known-bot-heavy list (see below) | `--stealth` / `use_proxy: true` (default on) | Paid |
| Password input on a login form | Credentials vault | All tiers |
| Site requires persistent logged-in state across sessions | Profile | All tiers |
| URL contains `chal_t=`, redirect to `/sorry/`, or your trace #1 needed `--stealth` to complete | `use_proxy: true` | Paid |
| reCAPTCHA / hCaptcha / Cloudflare turnstile iframe seen in either trace | `solve_captcha: true` | Paid |
| Content depended on geographic location, or you pinned `region: "lax"` / `region: "iad"` during recording | `useProxy: { geolocation: { country: ... } }` | Paid |

## Known bot-heavy sites — default stealth on

Some domains have aggressive bot detection that blocks or rate-limits non-stealth traffic intermittently, even when no specific challenge appears in the trace. If the target site is one of these (or a subdomain of one), default to `--stealth` / `use_proxy: true` from the first run, **before** looking for trace signals. This is cheap insurance — the false positive cost (paying for a proxy on a site that didn't strictly need it) is low; the false negative cost (a skill that works once and then mysteriously fails in production) is high.

Default-stealth domains include:

- `google.com`, `google.<TLD>` — Search, Maps, Flights, Scholar; `/sorry/` redirect is common
- `facebook.com`, `instagram.com`, `whatsapp.com`, anything under `*.meta.com`
- `linkedin.com` — aggressive bot detection
- `twitter.com`, `x.com`
- `booking.com`, `expedia.com`, `kayak.com`, `airbnb.com`, `vrbo.com` — travel aggregators all check
- `ticketmaster.com`, `livenation.com`, `stubhub.com`, `seatgeek.com` — ticketing sites are some of the strictest
- `amazon.com`, `amazon.<TLD>` — variable but often challenges
- `reddit.com` — anonymous browsing increasingly gated
- `cloudflare.com`-protected sites (you can detect this by checking `Server: cloudflare` headers or seeing a `__cf_bm` cookie set on the first navigation)
- Any banking, brokerage, or financial site

This list is not exhaustive. The rule of thumb: if the site shows logged-in-user content, sells something, or aggregates third-party data, assume bot detection. If it's a static documentation site, a Wikipedia mirror, or a government info page, stealth is unnecessary.

When you enable stealth proactively, mention it in the generated skill's first step ("Stealth on by default — Google triggers bot challenges intermittently") so the user understands why the option is there.

## Credentials vault

Use this when the trace shows a login form interaction.

**Setup (one-time, runs before the generated skill is first used):**
```bash
steel credentials create --origin https://example.com --username "<user>" --password "<pass>"
```

**In the generated skill's session-start step:**
```bash
steel browser start --session "$SESSION" --credentials
```

Steel detects the login form on the page and auto-fills from the vault. The generated skill never sees the credentials in plaintext.

**What to write in the generated SKILL.md (as a site-specific precondition):**
> Before first use, run `steel credentials create --origin https://example.com` with your username and password. Steel stores them in its vault and fills them automatically when this skill encounters the login form.

Always emit the precondition. Never put credentials in the skill body, parameters, or environment variables. If the user has explicitly asked for credentials-as-parameters (e.g., for multi-account workflows), accept it but warn about the risk.

## Profiles

Use this when the trace shows the user was already logged in but you don't see the login flow itself (meaning the session started authenticated). This typically means a profile or imported cookies was in play.

**Setup (one-time):** create a named profile via the Steel CLI or SDK, drive a session into a logged-in state once, then save it.

**In the generated skill's session-start step:**
```bash
steel browser start --session "$SESSION" --profile "${profile_id}"
```

The generated skill should accept `profile_id` as an input parameter — different users will have different profiles. Do not hardcode it.

If the steel CLI doesn't expose a profile flag in your installed version, the generated skill should fall back to the SDK form and the body should note the CLI/SDK split.

## Stealth / proxy

Trigger conditions, in priority order:
0. The target domain is on the known-bot-heavy list above. Enable stealth from the first recording. This is the most important rule — observe it *before* you try a clearnet recording. A failed first run wastes a session; a stealth-on first run almost always works.
1. Trace #1 needed `--stealth` to complete (you tried without and got challenged; you'll know because you debugged it yourself).
2. Either trace contains a navigation whose URL has `chal_t=` (Booking.com challenge token), `/sorry/` (Google), `cf-chl-` (Cloudflare challenge), or similar bot-detection markers.
3. Either trace contains visible references to bot challenge iframes or pages.

When any of these are true, the generated skill's session-start step should look like:
```bash
steel browser start --session "$SESSION" --stealth --session-timeout 600000
```

`--stealth` routes through Steel's residential proxy pool and enables anti-detection by default.

Optionally pin a region if the trace showed geo-sensitive content (a country-specific TLD, a localized currency that doesn't match the user's clearnet location):
```bash
steel browser start --session "$SESSION" --stealth --proxy-country DE
```

Or pick a Steel edge region for latency:
```bash
steel browser start --session "$SESSION" --stealth --region iad   # or lax
```

If the installed steel CLI doesn't accept those flags, the generated skill body should reach for the SDK equivalent and note the fallback.

**Cost note for the generated SKILL.md:** Mention that stealth/proxy is a paid Steel feature so the user isn't surprised by billing. One line is enough; don't lecture.

## CAPTCHA solving

Trigger conditions:
1. You needed `solve_captcha: true` to get either trace to complete.
2. Either trace shows interaction with a CAPTCHA iframe (reCAPTCHA, hCaptcha, Cloudflare turnstile) — search the trace for `iframe` targets with `src` matching these.
3. The flow hit a `chal_t=` URL and required a click-through.

`--stealth` already includes automatic CAPTCHA solving on paid plans — no separate flag needed. Steel detects reCAPTCHA / hCaptcha / Cloudflare turnstile and solves silently while the skill is running.

If the skill needs to explicitly check or trigger CAPTCHA handling (rare; only when the flow has unusual timing around the challenge), use the `steel-browser` CLI's `captcha status --wait` and `captcha solve` commands in-step:

```bash
steel browser captcha status --wait --session "$SESSION"
steel browser captcha solve --session "$SESSION"
```

Only emit manual mode if the trace shows the user did something custom around the CAPTCHA. Otherwise, default to `--stealth` and let it happen.

## Putting it together

A typical generated skill's first step should look like one of these shapes:

**Simple unauthenticated, low-bot-detection flow:**
```bash
steel browser start --session "$SESSION" --session-timeout 600000
```

**Logged-in flow on a bot-heavy site:**
```bash
steel browser start --session "$SESSION" --stealth --credentials --session-timeout 600000
```

**Pre-authenticated via profile:**
```bash
steel browser start --session "$SESSION" --stealth --profile "${profile_id}" --session-timeout 600000
```

Pick the smallest set of options that matches the evidence. If you find yourself adding `--stealth` "just in case" on a site that isn't on the bot-heavy list and never challenged either trace, drop it. Conversely, if the site *is* on the bot-heavy list, stealth on regardless of whether a challenge appeared.
