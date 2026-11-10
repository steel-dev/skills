# Let the user watch a browser task

Use this when the user asks to watch, or accepts an offer to watch a browser task
you are already doing. A live viewer complements the task; it is not a mandatory
setup demo or evidence that the task succeeded.

## Share the current task's viewer

Use the same task-owned session you created for the browser work:

```bash
steel browser live --session "$SESSION"
```

The command prints the actual viewer URL; it does not itself open the user's
browser. Present that returned URL as **Watch your cloud browser**, then continue
the requested work. Do not construct a guessed viewer URL, use a CDP connection
URL in its place, or reveal credential-bearing start responses or raw debug logs.

If there is no task yet, offer a useful action based on the user's context, or
offer to open and summarize a public URL they choose. Wait for their choice
before creating a demo session. Do not open a default site merely to produce a
viewer link.

## Keep lifecycle ownership clear

- Do not create an extra session just for the viewer.
- If the viewer is unavailable, report that limitation and continue the useful
  task if its browser operations still work. Do not claim the user can watch a
  URL you have not obtained.
- Stop the owned session after the task, including failure paths. Watching does
  not imply a request to leave it running indefinitely.
- If the user explicitly asks to keep it open, state that it remains active and
  mention the applicable timeout when known.

After normal cleanup, link the [dashboard](https://app.steel.dev) for session
history. Do not promise a replay exists unless you have verified its availability.
