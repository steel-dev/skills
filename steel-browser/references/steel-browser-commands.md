# Steel browser commands (v0.5.0)

Use the installed command's `--help` for full parameters. These examples target
the released HTTP Commands API CLI, not the former `agent-browser` passthrough.
Use the task's existing `$SESSION` name on every action. Refs and tab IDs below
are illustrative; use the values returned by the current session.

## Navigation and snapshots

```bash
steel --json browser navigate https://example.com --session "$SESSION"
steel --json browser navigate https://example.com --wait-until domcontentloaded --session "$SESSION"
steel --json browser back --session "$SESSION"
steel --json browser forward --session "$SESSION"
steel --json browser reload --session "$SESSION"
steel --json browser snapshot --session "$SESSION"
steel --json browser snapshot --interactive --compact --max-depth 3 --session "$SESSION"
```

`open` is an alias for `navigate`. Snapshots return refs such as `@e1`; take a
fresh snapshot after navigation or DOM changes. `browser close` is not a
navigation command in v0.5: stop an owned session with `browser stop`, or close
one tab with `browser tab close`.

## Interaction

```bash
steel --json browser click @e1 --session "$SESSION"
steel --json browser click @e1 --count 2 --session "$SESSION"
steel --json browser dblclick @e1 --session "$SESSION"
steel --json browser focus @e1 --session "$SESSION"
steel --json browser fill @e2 "Jane Doe" --session "$SESSION"
steel --json browser type @e2 "notes" --clear --delay 50 --session "$SESSION"
steel --json browser press Enter --session "$SESSION"
steel --json browser keydown Shift --session "$SESSION"
steel --json browser keyup Shift --session "$SESSION"
steel --json browser hover @e1 --session "$SESSION"
steel --json browser check @e1 --session "$SESSION"
steel --json browser uncheck @e1 --session "$SESSION"
steel --json browser select @e1 "California" --session "$SESSION"
steel --json browser clear @e1 --session "$SESSION"
steel --json browser selectall @e1 --session "$SESSION"
steel --json browser scroll down 500 --session "$SESSION"
steel --json browser scroll down 200 --selector ".panel" --session "$SESSION"
steel --json browser drag @e1 @e2 --session "$SESSION"
```

For lower-level pointer input, inspect `steel browser mouse --help`. Do not
assume old flags such as `click --new-tab` or `click --button` exist; they are not
v0.5 click flags. There are no `setvalue` or `scrollintoview` subcommands.

## Read page data and state

```bash
steel --json browser get text @e1 --session "$SESSION"
steel --json browser get html @e1 --session "$SESSION"
steel --json browser get markdown @e1 --session "$SESSION"
steel --json browser get value @e1 --session "$SESSION"
steel --json browser get attr @e1 href --session "$SESSION"
steel --json browser get title --session "$SESSION"
steel --json browser get url --session "$SESSION"
steel --json browser get count ".item" --session "$SESSION"
steel --json browser get box @e1 --session "$SESSION"
steel --json browser is visible @e1 --session "$SESSION"
steel --json browser is enabled @e1 --session "$SESSION"
steel --json browser is checked @e1 --session "$SESSION"
steel --json browser find ".item" --session "$SESSION"
steel --json browser content --session "$SESSION"
steel --json browser eval "document.title" --session "$SESSION"
```

There is no top-level `extract` or `get styles` command. Prefer refs/native
actions for interactions rather than script clicks that bypass their checks.

## Wait and download

```bash
steel --json browser wait --text "Success" --session "$SESSION"
steel --json browser wait --selector ".loaded" --session "$SESSION"
steel --json browser wait --selector ".modal" --state hidden --session "$SESSION"
steel --json browser wait --url "/dashboard" --session "$SESSION"
steel --json browser wait --load-state domcontentloaded --session "$SESSION"
steel --json browser wait --timeout 5000 --text "Done" --session "$SESSION"
steel --json browser wait 1000 --session "$SESSION"
```

Use the condition you need. `--timeout` bounds a wait; it is not a sleep by
itself. The command defaults to 30000 ms and caps a timeout at 50000 ms in v0.5.
There is no `--fn`/`--function` condition. For downloads, click first, then wait:

```bash
steel --json browser click @e4 --session "$SESSION"
steel --json browser wait --download --output ./report.csv --session "$SESSION"
```

See `references/downloads.md` for retrieval, local verification, and recovery.

## Screenshots, PDFs, and uploads

```bash
steel --json browser screenshot --output ./page.png --session "$SESSION"
steel --json browser screenshot --full-page --output ./full.png --session "$SESSION"
steel --json browser screenshot --selector "#chart" --output ./chart.png --session "$SESSION"
steel --json browser screenshot --format jpeg --quality 80 --output ./page.jpg --session "$SESSION"
steel --json browser pdf --output ./page.pdf --print-background --session "$SESSION"
steel --json browser upload @e1 ./report.pdf --session "$SESSION"
```

Use `--output`, not a positional screenshot path. `--annotate` is not a v0.5
screenshot flag. Upload only the file the user intended to submit.

## Tabs, dialogs, and command execution

```bash
steel --json browser tab list --session "$SESSION"
steel --json browser tab new https://example.com --session "$SESSION"
steel --json browser tab switch t2 --session "$SESSION"
steel --json browser tab close t2 --session "$SESSION"
steel --json browser dialog accept <dialog-id> --session "$SESSION"
steel --json browser status <execution-id> --session "$SESSION"
steel --json browser cancel <execution-id> --session "$SESSION"
steel --json browser batch "fill @e3 Seoul" "click @e7" "snapshot -i" --session "$SESSION"
```

Use IDs from the real response. Check `browser dialog --help` for the dialog
action and text options. Do not automatically replay a side-effecting action
after an ambiguous timeout; inspect its state first.

## Sessions, live viewing, and CAPTCHA

```bash
steel --json browser sessions
steel browser live --session "$SESSION"
steel --json browser captcha status --session "$SESSION"
steel --json browser captcha status --wait --timeout 120000 --session "$SESSION"
steel --json browser captcha solve --session "$SESSION"
steel --json browser stop --session "$SESSION"
```

CAPTCHA polling's timeout is separate from the action-wait timeout. Only use
solving when it is configured for the session/account; do not promise bypass.
See `references/steel-browser-lifecycle.md` for creation flags and ownership.

## Removed passthrough surfaces

Do not invoke the former `cookies`, `storage`, `set`, `highlight`, `bringtofront`,
`errors`, or `console` subcommands. They are not v0.5 browser commands. Use the
supported CLI/help, profiles, or session diagnostics appropriate to the actual
task instead of installing another runtime to restore old flags.
