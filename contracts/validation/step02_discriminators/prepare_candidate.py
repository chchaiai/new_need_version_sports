"""Rebuild the implemented Step 2 DRAFT from actual sources, without applying a probe patch."""
from __future__ import annotations

import argparse
import copy
import difflib
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path

import yaml

from check_discriminators import GROUPS, PREFIX, group_node, integrity_errors

BASELINE_SHA = "667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a"
CANDIDATE_SHA = "1df0e8a1b50b3b4c0cfa128064e8da714f949c761eec9aae9e9e64179d374b27"
CANDIDATE_VERSION = "1.2.1-contract.phase5-step02.1"
PATCH_SHA = "9574cec5e6bb5b3fb4e0279e71bf71e51777fb9d73419527a7a5ca1466fe0511"
CR_ID = "CR-20260901-005"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(contracts: Path, output: Path, baseline_contracts: Path):
    contracts, output, baseline_contracts = contracts.resolve(), output.resolve(), baseline_contracts.resolve()
    assert not output.is_relative_to(contracts.parent), "Evidence must remain outside the repository"
    assert sha(baseline_contracts / "openapi.yaml") == BASELINE_SHA, "Wrong immutable baseline"
    assert sha(contracts / "openapi.yaml") == CANDIDATE_SHA, "Step 2 input changed; reconcile before reusing evidence"
    source_names = {p.name for p in (baseline_contracts / "src").glob("*.py")}
    assert {p.name for p in (contracts / "src").glob("*.py")} == source_names
    patches = []
    for filename in ["applications.py", "services.py"]:
        before = (baseline_contracts / "src" / filename).read_text(encoding="utf-8")
        after = (contracts / "src" / filename).read_text(encoding="utf-8")
        patches.extend(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True),
                       fromfile="a/contracts/src/" + filename, tofile="b/contracts/src/" + filename))
    patch_text = "".join(patches)
    assert hashlib.sha256(patch_text.encode("utf-8")).hexdigest() == PATCH_SHA, "Actual source differs from accepted patch"
    for filename in source_names - {"applications.py", "services.py"}:
        assert (contracts / "src" / filename).read_bytes() == (baseline_contracts / "src" / filename).read_bytes(), filename
    before_build = (baseline_contracts / "scripts/build_contract.py").read_text(encoding="utf-8")
    expected_build = before_build.replace('CONTRACT_VERSION = "1.2.0-contract"', 'CONTRACT_VERSION = "' + CANDIDATE_VERSION + '"')
    expected_build = expected_build.replace('CONTRACT_STATUS = "RC"', 'CONTRACT_STATUS = "DRAFT"')
    expected_build = expected_build.replace('                "CR-20260901-003",', '                "CR-20260901-003",\n                "CR-20260901-005",')
    assert (contracts / "scripts/build_contract.py").read_text(encoding="utf-8") == expected_build, "Unexpected build configuration change"
    output.mkdir(parents=True, exist_ok=False)
    target = output / "contracts"
    (target / "scripts").mkdir(parents=True)
    (target / "src").mkdir()
    for filename in source_names:
        shutil.copyfile(contracts / "src" / filename, target / "src" / filename)
    shutil.copyfile(contracts / "scripts/build_contract.py", target / "scripts/build_contract.py")
    (output / "source-proposal.patch").write_text(patch_text, encoding="utf-8", newline="\n")
    artifacts = ["openapi.yaml", "operation-catalog.md", "contract-metadata.json"]
    actual_identities = {name: sha(contracts / name) for name in artifacts}
    commands, identities = [], []
    for i in range(2):
        command = [sys.executable, "-B", "-X", "utf8", str(target / "scripts/build_contract.py")]
        proc = subprocess.run(command, cwd=output, capture_output=True, text=True, encoding="utf-8")
        record = dict(command=command, cwd=str(output), exitCode=proc.returncode, stdout=proc.stdout, stderr=proc.stderr)
        commands.append(record)
        (output / f"build-{i + 1}.json").write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
        assert proc.returncode == 0, "Build failed; actual failure retained"
        identities.append({name: sha(target / name) for name in artifacts})
    assert identities[0] == identities[1] == actual_identities, "Checked-in artifacts differ from independent builds"
    baseline = yaml.safe_load((baseline_contracts / "openapi.yaml").read_bytes())
    candidate = yaml.safe_load((target / "openapi.yaml").read_bytes())
    expected = copy.deepcopy(baseline)
    expected["info"]["version"] = CANDIDATE_VERSION
    expected["info"]["x-contract-status"] = expected["x-contract-governance"]["status"] = "DRAFT"
    expected["x-contract-governance"]["acceptedPhase5ChangeRequests"].append(CR_ID)
    for name, (_, _, mapping) in GROUPS.items():
        group_node(expected, name)["discriminator"]["mapping"] = {wire: PREFIX + branch for wire, branch in mapping.items()}
    assert candidate == expected, "Unexpected semantic changes outside mapping and governance identity"
    assert not integrity_errors(candidate)
    assert sha(baseline_contracts / "openapi.yaml") == BASELINE_SHA
    result = dict(status="IMPLEMENTED_DRAFT_NOT_RELEASED", baselineSha256=BASELINE_SHA,
                  candidateVersion=CANDIDATE_VERSION, candidateStatus="DRAFT", candidateSha256=CANDIDATE_SHA,
                  patchSha256=PATCH_SHA, deterministic=True, actualRepositoryArtifactsMatch=True,
                  artifacts=actual_identities, commands=commands,
                  sourceFiles=[dict(path="src/"+name, sha256=sha(contracts / "src" / name)) for name in sorted(source_names)])
    (output / "identity.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--contracts", type=Path, required=True)
    parser.add_argument("--baseline-contracts", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(prepare(args.contracts, args.output, args.baseline_contracts), indent=2))
