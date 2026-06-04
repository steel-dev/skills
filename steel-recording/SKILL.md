---
name: steel-recording
description: Fetch the video recording of a Steel cloud-browser session and save it as a local MP4, given a session ID. Trigger whenever the user wants to "get/fetch/download the recording", "get the video", "save the replay", "grab the MP4 of that session", or otherwise wants a Steel session's screen recording as a file — even if they just paste a session ID and say "fetch this". Steel records every headful session as MP4/HLS; this skill pulls the HLS playlist, downloads the segments reliably, and muxes them into one playable file. Don't use this to diagnose why a session failed — that's steel-session-debugging; for live browsing use steel-browser.
license: MIT
compatibility: claude-code,codex,cursor,opencode,pi
metadata:
  owner: Niko
  category: operate
  stage: beta
---

# Steel Recording

Turn a Steel session ID into a local MP4 of the browser recording.

## Skill Boundary

Use this skill to download a session's screen recording as a playable file. Steel records every headful session automatically and serves it as an HLS playlist at `GET /v1/sessions/{id}/hls`. The bundled script handles the whole fetch; you mostly run it and report where the file landed.

Do not use this skill to explain *why* a session failed — that is `steel-session-debugging`, which reads metadata, logs, traces, and replay links for diagnosis. Do not use it for live web work; that is `steel-browser`.

## Inputs

- A Steel session ID (required).
- An optional output path. If omitted the script writes `steel-recording-<session-id>.mp4` in the current directory.

## Prerequisites

- `curl`, `ffmpeg`, `ffprobe`, `jq`, and `awk` on PATH.
- A Steel API key via `STEEL_API_KEY`, or an authenticated Steel CLI (`steel login` stores the key in `~/.config/steel/config.json`, which the script reads as a fallback).

## Workflow

```bash
scripts/fetch-recording.sh <session-id> [output.mp4]
```

The script prints the saved path, file size, and duration, and exits non-zero if the result looks incomplete. What it does and why:

1. **Resolves the API key** from `STEEL_API_KEY`, falling back to the `apiKey` in `~/.config/steel/config.json`.
2. **Fetches the HLS playlist** with the `steel-api-key` header.
3. **Downloads the init segment and every media segment to disk first**, with curl retries and timeouts, then muxes from local files. This is the key reliability choice: the recording storage backend is intermittently slow, and letting ffmpeg stream the remote playlist directly can stall mid-download and silently produce a truncated MP4. Download-then-mux avoids that.
4. **Muxes with `ffmpeg -c copy`** — no re-encode, fast and lossless.
5. **Verifies the muxed duration** against the playlist's summed segment durations. If they diverge by more than a second it warns and exits non-zero, so a partial download never passes as complete.

## Success Criteria

- A playable MP4 exists at the reported path.
- The script reports `Verified: duration matches playlist` (exit 0), not a duration-mismatch warning.

## Good To Know

- **Recordings expire.** Segment URLs in the playlist are presigned and stop working ~6 hours after the session ends. Fetch promptly; once the MP4 is on disk it is permanent.
- **Headful only.** MP4/HLS exists for headful sessions (the current default). A legacy headless session has no video — only rrweb DOM events at `/v1/sessions/{id}/events`. If the script reports no playlist, that is the likely reason.
- **No session ID handy?** `steel sessions list --json` lists recent sessions (most recent first); each has an `id` and a `sessionViewerUrl` for in-browser playback without downloading.
- **Privacy.** Recordings can contain logged-in state or page content. Do not upload them anywhere unless the user asks.

## Handoffs

- Session failed and you need to know why → `steel-session-debugging`.
- Bot detection, CAPTCHA, proxy, or identity issues → `steel-reliability`.
- Live browsing now → `steel-browser`.
