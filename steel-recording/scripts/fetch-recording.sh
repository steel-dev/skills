#!/usr/bin/env bash
# ABOUTME: Fetch a Steel cloud-browser session recording and save it as a local MP4.
# ABOUTME: Downloads the HLS playlist + segments, then muxes them with ffmpeg.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: fetch-recording.sh <session-id> [output.mp4]

Downloads the recording for a Steel session and writes a playable MP4.

Auth: reads STEEL_API_KEY, falling back to the apiKey in
      ~/.config/steel/config.json (where `steel login` stores it).

Notes:
  - Only headful sessions (the default) have MP4/HLS recordings. Legacy
    headless sessions only expose rrweb events at /v1/sessions/<id>/events.
  - The playlist's segment URLs are presigned and expire ~6 hours after the
    session ends, so fetch reasonably promptly.
EOF
}

[ $# -ge 1 ] || { usage; exit 1; }
case "$1" in -h|--help) usage; exit 0;; esac

SID="$1"
OUT="${2:-steel-recording-${SID}.mp4}"

# Resolve the API key: env var first (ignore empty), then the steel CLI config.
KEY="${STEEL_API_KEY:-}"
if [ -z "$KEY" ]; then
  CFG="$HOME/.config/steel/config.json"
  [ -f "$CFG" ] && KEY="$(jq -r '.apiKey // empty' "$CFG" 2>/dev/null || true)"
fi
[ -n "$KEY" ] || { echo "Error: no API key. Set STEEL_API_KEY or run \`steel login\`." >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 1. Fetch the HLS playlist (manifest of init + segments, with presigned URLs).
PLAYLIST="$WORK/playlist.m3u8"
HTTP="$(curl -sS -o "$PLAYLIST" -w '%{http_code}' \
  -H "steel-api-key: $KEY" \
  "https://api.steel.dev/v1/sessions/$SID/hls" || true)"

if [ "$HTTP" != "200" ]; then
  echo "Error: HLS request returned HTTP $HTTP for session $SID." >&2
  echo "If this is a legacy headless session there may be no video — try /events instead." >&2
  exit 1
fi
if ! grep -q '#EXTM3U' "$PLAYLIST"; then
  echo "Error: response was not a valid HLS playlist (no recording available?)." >&2
  exit 1
fi

# Expected duration = sum of all segment durations, used to verify completeness.
EXPECTED="$(awk -F: '/^#EXTINF/ {sub(/,.*/,"",$2); s+=$2} END {printf "%.2f", s}' "$PLAYLIST")"
NSEG="$(grep -cE '^https://' "$PLAYLIST" || true)"   # bare URL lines = segments
echo "Playlist: $NSEG segments, ~${EXPECTED}s expected."

# 2. Download init + each segment to disk with retries. We download first and
#    mux locally rather than letting ffmpeg stream the remote playlist, because
#    the storage backend is intermittently slow and a mid-stream stall silently
#    truncates the output. Local files + a duration check make it reliable.
dl() {  # dl <url> <dest>
  curl -sS --connect-timeout 10 --max-time 180 \
    --retry 6 --retry-delay 2 --retry-all-errors -o "$2" "$1"
}

LOCAL="$WORK/local.m3u8"
{ echo "#EXTM3U"; echo "#EXT-X-VERSION:6"; echo "#EXT-X-TARGETDURATION:5"; echo "#EXT-X-MEDIA-SEQUENCE:0"; } > "$LOCAL"

INIT_URL="$(grep -oE '#EXT-X-MAP:URI="[^"]+"' "$PLAYLIST" | head -1 | sed -E 's/.*URI="([^"]+)".*/\1/')"
if [ -n "$INIT_URL" ]; then
  dl "$INIT_URL" "$WORK/init.mp4"
  echo '#EXT-X-MAP:URI="init.mp4"' >> "$LOCAL"
fi

# Segment URLs and their EXTINF durations appear in matching order.
grep -E '^https://' "$PLAYLIST" > "$WORK/urls.txt"
grep -E '^#EXTINF' "$PLAYLIST" | sed -E 's/#EXTINF:([0-9.]+),/\1/' > "$WORK/durs.txt"

n=1
while IFS= read -r url <&3 && IFS= read -r dur <&4; do
  dl "$url" "$WORK/seg_$n.m4s"
  printf '#EXTINF:%s,\nseg_%s.m4s\n' "$dur" "$n" >> "$LOCAL"
  printf '\r  downloaded %d/%s segments' "$n" "$NSEG" >&2
  n=$((n + 1))
done 3<"$WORK/urls.txt" 4<"$WORK/durs.txt"
echo "#EXT-X-ENDLIST" >> "$LOCAL"
echo >&2

# 3. Mux the local segments into a single MP4 (stream copy — no re-encode).
ffmpeg -y -loglevel error -allowed_extensions ALL -i "$LOCAL" -c copy "$OUT"

# 4. Verify the muxed duration matches the playlist, so a partial download
#    can't masquerade as a complete recording.
ACTUAL="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" 2>/dev/null || echo 0)"
DELTA="$(awk -v a="$ACTUAL" -v e="$EXPECTED" 'BEGIN{d=a-e; if(d<0)d=-d; printf "%.2f", d}')"
SIZE="$(ls -lh "$OUT" | awk '{print $5}')"

echo "Saved: $OUT (${SIZE}, ${ACTUAL}s)"
if awk -v d="$DELTA" 'BEGIN{exit !(d > 1.0)}'; then
  echo "Warning: duration off by ${DELTA}s from expected ${EXPECTED}s — recording may be incomplete." >&2
  exit 2
fi
echo "Verified: duration matches playlist (±${DELTA}s)."
