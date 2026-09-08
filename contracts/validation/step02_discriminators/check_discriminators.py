"""Read-only integrity gate for the three CR-005 unions. Never rewrites a Contract."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import yaml

GROUPS = {
    "CreateStudentApplicationRequest": (None, "applicationType", {
        "EXEMPTION": "CreateExemptionApplicationRequest",
        "CERTIFICATION": "CreateCertificationApplicationRequest",
    }),
    "ReviseEnduranceRuleTableRequest": ("change", "action", {
        "ADD": "AddEnduranceRuleIntervalChange",
        "UPDATE": "UpdateEnduranceRuleIntervalChange",
        "DELETE": "DeleteEnduranceRuleIntervalChange",
    }),
    "SwitchSystemModeRequest": (None, "targetMode", {
        "MAINTENANCE": "EnterMaintenanceRequest", "NORMAL": "ReturnNormalRequest",
    }),
}
PREFIX = "#/components/schemas/"


def group_node(spec: dict[str, Any], name: str) -> dict[str, Any]:
    node = spec["components"]["schemas"][name]
    nested = GROUPS[name][0]
    return node["properties"][nested] if nested else node


def integrity_errors(spec: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    schemas = spec.get("components", {}).get("schemas", {})
    for name, (_, prop, declared) in GROUPS.items():
        def fail(message: str) -> None:
            errors.append(f"{name}: {message}")
        try:
            node = group_node(spec, name)
        except (KeyError, TypeError):
            fail("missing reviewed union location")
            continue
        discriminator = node.get("discriminator", {})
        if discriminator.get("propertyName") != prop:
            fail("discriminator property differs from reviewed property")
        mapping = discriminator.get("mapping")
        expected = {wire: PREFIX + branch for wire, branch in declared.items()}
        if mapping != expected:
            fail("explicit mapping differs from reviewed wire/target set")
        branches = node.get("oneOf")
        if not isinstance(branches, list) or any(not isinstance(b, dict) or set(b) != {"$ref"} for b in branches):
            fail("oneOf must enumerate the reviewed references")
            continue
        refs = [b["$ref"] for b in branches]
        if len(refs) != len(set(refs)) or set(refs) != set(expected.values()):
            fail("oneOf has missing, extra or duplicate targets")
        for wire, branch_name in declared.items():
            branch = schemas.get(branch_name)
            if not isinstance(branch, dict):
                fail(f"unresolved branch {branch_name}")
                continue
            field = branch.get("properties", {}).get(prop, {})
            if field.get("type") != "string" or field.get("const") != wire:
                fail(f"{branch_name}.{prop} must retain its non-null string const")
            if prop not in branch.get("required", []):
                fail(f"{branch_name}.{prop} must remain required")
            if field.get("nullable") is True:
                fail(f"{branch_name}.{prop} cannot be nullable")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec", type=Path, required=True)
    args = parser.parse_args()
    spec = yaml.safe_load(args.spec.read_bytes())
    errors = integrity_errors(spec)
    print(json.dumps({"groups": len(GROUPS), "branches": sum(len(g[2]) for g in GROUPS.values()),
                      "passed": not errors, "errors": errors}, ensure_ascii=False, indent=2))
    raise SystemExit(bool(errors))


if __name__ == "__main__":
    main()
