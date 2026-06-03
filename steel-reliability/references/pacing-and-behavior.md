# Pacing And Behavior

Many failures come from acting faster or more repetitively than the target flow expects.

## Improvements

- Wait for visible page state, not only fixed time.
- Add short human-scale delays between repeated form actions.
- Lower concurrency per domain.
- Avoid identical rapid retries after blocked responses.
- Reuse authenticated profiles instead of logging in repeatedly.
- Verify after each important transition.

## Retry Policy

Retry when the evidence indicates a transient failure:

- proxy tunnel error
- 5xx response
- network reset
- navigation timeout on an otherwise healthy route

Do not retry indefinitely after:

- account lockout
- repeated CAPTCHA loop
- clear access denied page
- invalid credentials

Escalate one factor at a time so the next run teaches you something.
