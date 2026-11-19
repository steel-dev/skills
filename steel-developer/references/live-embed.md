# Live And Past Session Embeds

Use this reference when building product UI around Steel sessions.

## Surfaces

- live session viewer for real-time debugging or user handoff
- past session player for replay
- HLS recording when available
- agent traces for timeline views
- human-in-the-loop controls for sensitive steps

## Implementation Guidance

- Store session IDs and viewer/player URLs as sensitive operational data.
- Use generated clients or API reference for exact endpoint shapes.
- Treat replay links and screenshots as potentially sensitive.
- Build explicit states for live, released, failed, and unavailable recordings.
- Route post-run diagnosis to `steel-session-debugging`.

## References

- Embed sessions: https://steel.dev/docs/observability/embed-a-live-browser
- Live sessions: https://steel.dev/docs/observability/embed-a-live-browser
- Past sessions: https://steel.dev/docs/observability/recordings#embed-a-replay
- Agent traces: https://steel.dev/docs/observability/agent-traces
- Human-in-the-loop: https://steel.dev/docs/observability/hand-control-to-a-human
