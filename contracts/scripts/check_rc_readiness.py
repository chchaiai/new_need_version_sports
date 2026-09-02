from __future__ import annotations

import json
from pathlib import Path


CONTRACT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    metadata = json.loads((CONTRACT_ROOT / "contract-metadata.json").read_text(encoding="utf-8"))
    pending = sorted((CONTRACT_ROOT / "decisions").glob("PENDING-*.md"))
    problems: list[str] = []
    if metadata["contractStatus"] not in {"RC", "APPROVED", "LOCKED"}:
        problems.append(f"contract status is {metadata['contractStatus']}, not RC or later")
    if pending:
        problems.append("pending decisions: " + ", ".join(path.name for path in pending))

    if problems:
        print("RC readiness BLOCKED:")
        for problem in problems:
            print(f"- {problem}")
        raise SystemExit(1)
    print("RC readiness PASS: no PENDING decision and status is RC or later.")


if __name__ == "__main__":
    main()
