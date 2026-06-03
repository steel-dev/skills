# Profiles And Identity

Use profiles when reliability depends on persistent browser identity: cookies, login state, extension state, settings, and reputation.

## Pattern

1. Create a session with `persistProfile: true`.
2. Complete login or setup.
3. Release the session so Steel persists the profile.
4. Reuse future sessions with `profileId`.
5. Include `persistProfile: true` again when the session should update stored state.

## Session Context

Use `sessionContext` for lighter cookie/localStorage transfer between sessions. Capture it before releasing the source session. Treat it as sensitive data.

## Reliability Guidance

- Fix missing auth/profile state before adding proxies.
- Use one profile per user/account namespace.
- Avoid sharing profiles across unrelated target sites.
- Verify login success with a page assertion after every reused profile session.
