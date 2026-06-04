# Steel Recording Skill

Fetches a Steel browser session's screen recording and saves it as a local, playable MP4.

## Install

```bash
npx skills add steel-dev/skills --skill steel-recording
```

## Example Prompts

- "Fetch the recording for Steel session `sess_123` and save it to my Desktop."
- "Grab the MP4 of that session." (after pasting a session ID)
- "Download the replay video for this run."

## Requirements

`curl`, `ffmpeg`, `ffprobe`, `jq`, and `awk` on PATH, plus a Steel API key via `STEEL_API_KEY` or `steel login`.

## Files

- `SKILL.md`: routing, boundary, inputs, workflow, and success criteria.
- `scripts/fetch-recording.sh`: downloads the HLS playlist + segments and muxes them into an MP4.
- `evals/evals.json`: routing and behavior assertions.

## Development

Run the validation script from the repository root:

```bash
node scripts/validate-skills.mjs
```
