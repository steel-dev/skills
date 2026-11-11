#!/usr/bin/env python3
"""Parse the browser skill's executable examples with a released CLI, without API calls."""
import argparse
from pathlib import Path
import shlex
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", type=Path, required=True)
    args = parser.parse_args()
    binary = args.binary.resolve(strict=True)
    root = Path(__file__).resolve().parents[1]
    files = [root / "steel-browser/SKILL.md", *sorted((root / "steel-browser/references").glob("*.md"))]
    checked = 0
    with tempfile.TemporaryDirectory(prefix="steel-help-check-") as home:
        env = {"HOME": home, "STEEL_CONFIG_DIR": home, "STEEL_TELEMETRY_DISABLED": "1"}
        version = subprocess.check_output([str(binary), "--version"], env=env, text=True, timeout=10).strip()
        for path in files:
            shell = False
            for line_number, line in enumerate(path.read_text().splitlines(), 1):
                if line.startswith("```"):
                    shell = line.strip() in {"```bash", "```sh"}
                    continue
                if not shell or not line.startswith("steel "):
                    continue
                command = shlex.split(line)[1:]
                # A bare -- would turn the appended help flag into a positional
                # argument. Never let a documentation check execute an API call.
                if "--" in command:
                    raise ValueError(f"{path.name}:{line_number}: unsupported end-of-options marker")
                result = subprocess.run([str(binary), "--no-update-check", *command, "--help"],
                                        env=env, capture_output=True, text=True, timeout=10)
                if result.returncode:
                    raise ValueError(f"{path.relative_to(root)}:{line_number}: {result.stderr.strip()}")
                checked += 1
    print(f"OK: {checked} browser command examples parse with {version}; no browser/API task executed")


if __name__ == "__main__":
    main()
