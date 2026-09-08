"""Verify CR-005 fixtures and mutation sensitivity; export an identical JS test input."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry
from referencing.jsonschema import DRAFT202012

from check_discriminators import GROUPS, PREFIX, group_node, integrity_errors


def build_cases(fixtures):
    cases = []
    for fixture in fixtures:
        name, prop = fixture["schema"], fixture["property"]
        nested = GROUPS[name][0]
        mutations = [("legal", None, True), ("unknown", "UNKNOWN", False),
                     ("schema_name", fixture["branch"], False), ("null", None, False),
                     ("numeric", 1, False), ("missing", None, False), ("extra_field", None, False)]
        other_wire = next(w for w in GROUPS[name][2] if w != fixture["wire"])
        mutations.append(("wrong_branch_shape", other_wire, False))
        for kind, value, expected in mutations:
            payload = copy.deepcopy(fixture["payload"])
            owner = payload[nested] if nested else payload
            if kind == "missing":
                owner.pop(prop)
            elif kind == "extra_field":
                owner["unexpectedField"] = True
            elif kind != "legal":
                owner[prop] = value
            cases.append({"name": fixture["wire"] + "/" + kind, "schema": name,
                          "expectedValid": expected, "payload": payload})
    for wire, nested in [("CERTIFICATION", "certification"), ("MAINTENANCE", "announcement"), ("ADD", None)]:
        f = next(f for f in fixtures if f["wire"] == wire)
        payload = copy.deepcopy(f["payload"])
        owner = payload[nested] if nested else payload
        owner["unexpectedField"] = True
        cases.append({"name": wire + "/nested_or_envelope_extra", "schema": f["schema"],
                      "expectedValid": False, "payload": payload})
    return cases


def mutation_results(spec):
    results = []
    for name, (_, prop, declared) in GROUPS.items():
        first, second = list(declared)[:2]
        for mutation in ["no_discriminator", "no_mapping", "missing_key", "extra_key", "schema_name_key",
                         "swapped_target", "unresolved_target", "duplicate_oneof", "missing_oneof",
                         "missing_required", "wrong_const", "nullable_type", "nullable_flag"]:
            broken = copy.deepcopy(spec)
            node = group_node(broken, name)
            branch = broken["components"]["schemas"][declared[first]]
            mapping = node["discriminator"]["mapping"]
            if mutation == "no_discriminator": del node["discriminator"]
            elif mutation == "no_mapping": del node["discriminator"]["mapping"]
            elif mutation == "missing_key": del mapping[first]
            elif mutation == "extra_key": mapping["UNKNOWN"] = mapping[first]
            elif mutation == "schema_name_key": mapping[declared[first]] = mapping.pop(first)
            elif mutation == "swapped_target": mapping[first], mapping[second] = mapping[second], mapping[first]
            elif mutation == "unresolved_target": mapping[first] = PREFIX + "MissingSchema"
            elif mutation == "duplicate_oneof": node["oneOf"].append(copy.deepcopy(node["oneOf"][0]))
            elif mutation == "missing_oneof": node["oneOf"].pop()
            elif mutation == "missing_required": branch["required"].remove(prop)
            elif mutation == "wrong_const": branch["properties"][prop]["const"] = declared[first]
            elif mutation == "nullable_type": branch["properties"][prop]["type"] = ["string", "null"]
            elif mutation == "nullable_flag": branch["properties"][prop]["nullable"] = True
            results.append({"name": name + "/" + mutation, "rejected": bool(integrity_errors(broken))})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    repository = Path(__file__).resolve().parents[3]
    output = args.output.resolve()
    if output.is_relative_to(repository):
        raise SystemExit("Generated evidence must be outside the repository.")
    output.mkdir(parents=True, exist_ok=True)
    raw = args.spec.read_bytes()
    spec = yaml.safe_load(raw)
    baseline = yaml.safe_load(args.baseline.read_bytes())
    fixtures = json.loads(Path(__file__).with_name("fixtures.json").read_text(encoding="utf-8"))
    assert len(fixtures) == 7 and {f["wire"] for f in fixtures} == {w for g in GROUPS.values() for w in g[2]}
    errors = integrity_errors(spec)
    assert not errors, errors
    baseline_errors = integrity_errors(baseline)
    assert len(baseline_errors) == 3, baseline_errors
    cases = build_cases(fixtures)
    base_uri = "urn:bnbu:step02"
    registry = Registry().with_resource(base_uri, DRAFT202012.create_resource(spec))
    old_registry = Registry().with_resource(base_uri, DRAFT202012.create_resource(baseline))
    results = []
    for case in cases:
        ref = {"$ref": base_uri + PREFIX + case["schema"]}
        actual = Draft202012Validator(ref, registry=registry, format_checker=FormatChecker()).is_valid(case["payload"])
        old_actual = Draft202012Validator(ref, registry=old_registry, format_checker=FormatChecker()).is_valid(case["payload"])
        results.append(dict(case, actualValid=actual, baselineValid=old_actual,
                            passed=actual == old_actual == case["expectedValid"]))
    mutations = mutation_results(spec)
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "candidateSha256": hashlib.sha256(raw).hexdigest(),
              "candidateVersion": spec["info"]["version"], "candidateStatus": spec["info"]["x-contract-status"],
              "caseCount": len(results), "passed": sum(r["passed"] for r in results),
              "mutationCount": len(mutations), "mutationsRejected": sum(r["rejected"] for r in mutations),
              "baselineGateErrors": baseline_errors, "cases": results, "mutations": mutations}
    (output / "python-result.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "runtime-input.json").write_text(json.dumps({"candidateSha256": report["candidateSha256"],
         "spec": spec, "cases": cases}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k not in {"cases", "mutations"}}, ensure_ascii=False, indent=2))
    assert all(r["passed"] for r in results) and all(r["rejected"] for r in mutations)


if __name__ == "__main__": main()
