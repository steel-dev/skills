#!/usr/bin/env python3
"""Check release/detach and saved-device endpoint semantics using a loopback API.

Run in a network-disabled container: the real CLI is invoked with synthetic
device state only. No live Steel service, account, or browser is involved.
"""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time

ATTACHED = "11111111-2222-4333-8444-555555555555"
OWNED = "66666666-7777-4888-8999-000000000000"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    binary = parser.parse_args().binary.resolve(strict=True)
    calls = []

    class API(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def reply(self, body):
            calls.append((self.command, self.path))
            self.rfile.read(int(self.headers.get("Content-Length", "0")))
            raw = json.dumps(body).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def do_GET(self):
            self.reply({"id": self.path.rsplit("/", 1)[-1], "status": "live"})

        def do_POST(self):
            if self.path.endswith("/commands"):
                self.reply({"next": "op_1", "epoch": 1,
                            "page": {"tab": "t1", "url": "https://example.test", "title": "Fixture"},
                            "execution": {"id": "x1", "state": "completed", "effect": "none", "ran": 1},
                            "results": [{"ok": True, "effect": "none", "value": "Fixture"}]})
            elif self.path == "/v1/sessions":
                self.reply({"id": OWNED, "status": "live", "timeout": 900000})
            else:
                self.reply({"success": True})

    server = ThreadingHTTPServer(("127.0.0.1", 0), API)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base = f"http://127.0.0.1:{server.server_port}/v1"
    try:
        with tempfile.TemporaryDirectory(prefix="steel-semantics-") as temp:
            for case in ("explicit-stop", "stop-all"):
                config = Path(temp) / case
                config.mkdir(mode=0o700)
                state = {"settings": {"issuer": base.removesuffix("/v1"), "audience": "https://fixture.example", "api_base_url": base},
                         "installation_id": "synthetic-fixture", "pending": None,
                         "tokens": {"access_token": "synthetic-access", "refresh_token": "synthetic-refresh", "expires_at": int(time.time()) + 3600}}
                auth = config / "auth.json"
                auth.write_text(json.dumps(state))
                auth.chmod(0o600)
                env = {"HOME": str(config), "STEEL_CONFIG_DIR": str(config), "STEEL_TELEMETRY_DISABLED": "1"}

                def run(*args):
                    result = subprocess.run([str(binary), "--no-update-check", "--json", *args],
                                            env=env, capture_output=True, text=True, timeout=15)
                    assert result.returncode == 0, (case, args, result.stdout, result.stderr)
                    return json.loads(result.stdout)

                calls.clear()
                # No API URL flag or env var: the synthetic saved device endpoint
                # must be selected instead of the production default.
                run("sessions", "get", ATTACHED)
                assert calls == [("GET", f"/v1/sessions/{ATTACHED}")]
                run("browser", "get", "title", "--session", ATTACHED)
                if case == "explicit-stop":
                    run("browser", "stop", "--session", ATTACHED)
                    assert ("POST", f"/v1/sessions/{ATTACHED}/release") in calls
                else:
                    run("browser", "start", "--session", "own")
                    result = run("browser", "stop", "--all")["data"]
                    assert ("POST", f"/v1/sessions/{OWNED}/release") in calls
                    assert ("POST", f"/v1/sessions/{ATTACHED}/release") not in calls
                    assert result["detachedSessions"] == [ATTACHED] and result["stoppedSessions"] == ["own"]
        print("OK: saved device endpoint, explicit attached-ID release, and stop-all detach behavior verified against loopback")
    finally:
        server.shutdown()
        server.server_close()
        worker.join()


if __name__ == "__main__":
    main()
