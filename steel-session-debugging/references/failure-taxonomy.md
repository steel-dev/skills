# Failure Taxonomy

Use one primary class and optional secondary classes.

## Setup And Platform

- setup/auth failure
- API unreachable or invalid key
- invalid or expired session
- session ended early
- unavailable logs or traces
- platform-side incident

## Browser And Page

- page never loaded
- navigation timeout
- wrong page state
- JavaScript/runtime error
- network/API failure
- file upload/download failure
- popup, modal, or tab focus problem

## Agent Behavior

- stale element ref or selector
- wrong target clicked or typed into
- wait condition mismatch
- extraction read from old state
- incomplete cleanup or unreleased session

## Auth And Reliability

- login/auth state missing
- profile/session context mismatch
- CAPTCHA not solved
- bot detection or access denied
- proxy failure
- suspicious pacing or concurrency

Route auth/reliability classes to `steel-reliability` after collecting enough evidence.
