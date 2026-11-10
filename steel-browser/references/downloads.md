# Browser downloads

Use this reference when the user needs an artifact produced by a browser action,
not just page text. These commands target Steel CLI v0.5.0 or later.

## Retrieve the file

1. Use the existing task-owned named session. Navigate to the report page and
   snapshot it; identify the real download control from its current ref.
2. Click the download control, then wait in the foreground in that same session.
3. Choose an explicit output path inside the user's workspace. Check for an
   existing file before choosing a path; do not overwrite unrelated user work.

```bash
steel --json browser snapshot -i --session "$SESSION"
# Example ref only: use the ref from the snapshot above.
steel --json browser click @e4 --session "$SESSION"
steel --json browser wait --download --output ./report.csv --session "$SESSION"
```

`wait --download --output` retrieves bytes through the session's Files API and
saves them locally. It is not just a wait for a browser event. The successful
v0.5 result includes the downloaded file and local path under `data.results`.
Check the response and the actual local file; do not invent a checksum or claim
a file exists based only on the click succeeding.

Use your file-reading tools to parse the content and verify the requested
result. For a CSV, inspect its headers, parse the relevant columns, and compute
the answer from the downloaded rows. For another format, use an appropriate
local reader. Keep retrieval, content correctness, and cleanup as separate checks.

## Ordering and timeouts

Do not start `wait --download` in the background before clicking. Commands can
be serialized in the session, leaving the click waiting behind the pending
download wait. The observed symptom is a wait timeout followed by a successful
click and a later successful retrieval. Avoid that sequence by clicking first.

The wait defaults to 30 seconds and accepts `--timeout` up to 50000 milliseconds
in v0.5.0. This is a command wait limit, distinct from the browser session's
create-time timeout. Check the installed help if the version differs:

```bash
steel browser wait --help
```

After a timeout:

- Preserve the error and inspect whether the click actually ran and whether a
  local output already exists. Keep the same session while investigating.
- If the click succeeded and evidence indicates the download started, one
  bounded foreground wait in that session may retrieve it. Do not loop until a
  green result or restart the session, which may discard the file.
- Do not blindly click again: exports may be non-idempotent or create duplicates.
  If no download started, inspect a fresh snapshot or failure evidence before
  deciding whether another action is appropriate.
- If the artifact remains missing or invalid, report it as unresolved and load
  `steel-session-debugging` when deeper evidence is needed.

There is no `steel browser download` command in v0.5.0, and this flow does not
require `browser files list/download`, a daemon, CDP setup, or JavaScript clicks.

## Finish

Retrieve and inspect the artifact before releasing its session. On success or
failure, stop only the browser created for this task unless the user asked to
keep it open:

```bash
steel --json browser stop --session "$SESSION"
```

Report the local path, verified result, and any failed attempt/recovery. Do not
describe a recovered timeout as a failure-free run.
