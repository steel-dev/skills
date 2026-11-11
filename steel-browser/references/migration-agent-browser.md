# Migrating older browser scripts to Steel CLI v0.5

v0.5 browser commands use the HTTP Commands API. They are not a vendored
`agent-browser` interface, so replacing a command prefix is not a complete
migration. Check the installed command help before reusing old flags.

| Older pattern | v0.5 pattern |
| --- | --- |
| `agent-browser open <url>` | Create a named session, then `steel browser navigate <url> --session <name>` |
| `browser close` | `browser stop --session <name>` for an owned session; `browser tab close` for one tab |
| Positional screenshot path | `browser screenshot --output <path>` |
| `wait @e1` | `browser wait --selector @e1` |
| A delay | `browser wait 1000`; `--timeout 1000` alone is not a delay condition |
| Automatic JSON when piped, or `--raw` | Explicit `--json` |
| Generic `--cdp` or `--auto-connect` | Use a named session or an explicitly authorized session ID |
| Local daemon/browser subprocess | Actions execute in the cloud/self-hosted Commands API service |

## Example

```bash
SESSION="steel-task-$(date +%s)-$$"
steel --json browser start --session "$SESSION"
steel --json browser navigate https://example.com --session "$SESSION"
steel --json browser snapshot -i --session "$SESSION"
# Use refs from the current snapshot, not these illustrative values.
steel --json browser click @e3 --session "$SESSION"
steel --json browser snapshot -i --session "$SESSION"
steel --json browser get text @e7 --session "$SESSION"
steel --json browser screenshot --output ./page.png --session "$SESSION"
steel --json browser stop --session "$SESSION"
```

Do not assume old cookie/storage/settings commands still exist. Use
`references/steel-browser-commands.md` and the installed help. For browser
downloads use `wait --download --output`, not a new Files subcommand or a CDP
workaround. For attachments and cleanup, read
`references/steel-browser-lifecycle.md`: an explicit stop releases even an
ID-attached cloud browser. Only the account-spanning `stop --all` path treats
attached sessions as detach-only; do not use it as task cleanup.
