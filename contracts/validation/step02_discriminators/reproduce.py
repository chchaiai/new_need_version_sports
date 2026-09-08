"""Verify the implemented Step 2 DRAFT in a fresh external directory. Never releases it."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from prepare_candidate import BASELINE_SHA, CANDIDATE_SHA, prepare

WRAPPERS = ["AddEnduranceRuleIntervalChange", "CertificationDetails", "CertificationKind",
            "CreateCertificationApplicationRequest", "CreateExemptionApplicationRequest", "CreateStudentApplicationRequest",
            "DeleteEnduranceRuleIntervalChange", "EnterMaintenanceRequest", "MaintenanceAnnouncement", "ReturnNormalRequest",
            "ReviseEnduranceRuleTableRequest", "ReviseEnduranceRuleTableRequestChange", "SwitchSystemModeRequest", "UpdateEnduranceRuleIntervalChange"]


def digest(file): return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--baseline-contracts", type=Path, required=True, help="Immutable 1.2.0 Contract directory")
    parser.add_argument("--tools", type=Path, required=True, help="Local paths and SHA-pinned JVM artifacts; see README")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    repo, out = args.repo.resolve(), args.output.resolve()
    assert not out.is_relative_to(repo), "Output cannot enter the repository"
    out.mkdir(parents=True, exist_ok=False)
    src = Path(__file__).resolve().parent
    tools = json.loads(args.tools.read_text(encoding="utf-8-sig"))
    for artifact in tools["artifacts"]:
        assert digest(Path(artifact["path"])) == artifact["sha256"], artifact["path"]
    for root_key, names in [("nodeRoot", {"typescript": "5.9.3", "openapi-typescript": "7.13.0", "@redocly/cli": "2.51.2"}),
                            ("ajvRoot", {"ajv": "8.17.1", "ajv-formats": "3.0.1"})]:
        for name, version in names.items():
            assert json.loads((Path(tools[root_key]) / "node_modules" / name / "package.json").read_text())["version"] == version
    node, java_home = tools["node"], Path(tools["javaHome"])
    suffix = ".exe" if os.name == "nt" else ""
    java, javac = str(java_home / "bin" / ("java" + suffix)), str(java_home / "bin" / ("javac" + suffix))
    modules = Path(tools["nodeRoot"]) / "node_modules"
    logs = []
    env = dict(os.environ, REDOCLY_TELEMETRY="off", PYTHONDONTWRITEBYTECODE="1")
    def run(label, command, expected_exit=0):
        command = [str(x) for x in command]
        started = datetime.now(timezone.utc)
        p = subprocess.run(command, cwd=out, env=env, capture_output=True, text=True, encoding="utf-8")
        record = dict(label=label, command=command, cwd=str(out), startedAt=started.isoformat(),
                      seconds=(datetime.now(timezone.utc)-started).total_seconds(), exitCode=p.returncode,
                      stdout=p.stdout, stderr=p.stderr,
                      expectedExitCode=expected_exit,
                      environmentOverrides={"REDOCLY_TELEMETRY": "off", "PYTHONDONTWRITEBYTECODE": "1"})
        logs.append(record)
        (out / (label + ".json")).write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(label + ": exit " + str(p.returncode), flush=True)
        if p.returncode != expected_exit:
            raise RuntimeError(label + " failed; retained actual log; no downstream checks executed")
        return p

    versions = {"python": sys.version, "node": run("01-node-version", [node, "--version"]).stdout.strip(),
                "java": run("02-java-version", [java, "-version"]).stderr.strip(),
                "generator": run("03-generator-version", [java, "-jar", tools["generatorJar"], "version"]).stdout.strip()}
    assert versions["generator"] == "7.24.0"
    candidate_identity = prepare(repo / "contracts", out / "candidate", args.baseline_contracts)
    # Consumers read the actual repository artifact, already proven byte-identical to two independent builds.
    spec = repo / "contracts/openapi.yaml"
    run("04a-contract-verify", [sys.executable, "-B", "-X", "utf8", repo / "contracts/scripts/verify_contract.py"])
    readiness = run("04b-rc-readiness", [sys.executable, "-B", "-X", "utf8", repo / "contracts/scripts/check_rc_readiness.py"], expected_exit=1)
    assert readiness.stdout.strip().splitlines() == ["RC readiness BLOCKED:", "- contract status is DRAFT, not RC or later"], "Unexpected release blocker"
    run("04-schema-and-integrity", [sys.executable, "-B", "-X", "utf8", src / "run_checks.py", "--spec", spec,
                                    "--baseline", args.baseline_contracts / "openapi.yaml", "--output", out / "checks"])
    run("05-typescript-generation", [node, modules / "openapi-typescript/bin/cli.js", spec, "-o", out / "generated.d.ts"])
    fixtures = json.loads((src / "fixtures.json").read_text(encoding="utf-8"))
    ts = ['import type { components } from "./generated";', 'type S = components["schemas"];']
    for i, f in enumerate(fixtures):
        ts.append(f'const f{i}: S["{f["schema"]}"] = ' + json.dumps(f["payload"], ensure_ascii=False) + ";")
        for j, bad in enumerate(["UNKNOWN", f["branch"], None, 1]):
            ts += ["// @ts-expect-error reject invalid discriminator in the actual generated type",
                   f'const bad{i}_{j}: S["{f["branch"]}"]["{f["property"]}"] = ' + json.dumps(bad) + ";"]
    ts.append("console.log(JSON.stringify([" + ",".join(f"f{i}" for i in range(7)) + "]));")
    (out / "typed-fixtures.ts").write_text("\n".join(ts) + "\n", encoding="utf-8")
    run("06-typescript-compile", [node, modules / "typescript/bin/tsc", "--strict", "--target", "ES2022", "--module", "commonjs",
                                  "--outDir", out / "ts", out / "typed-fixtures.ts"])
    wire = run("07-typescript-wire", [node, out / "ts/typed-fixtures.js"])
    assert json.loads(wire.stdout) == [f["payload"] for f in fixtures]
    run("08-javascript-runtime", [node, src / "runtime_web.cjs", out / "checks/runtime-input.json", tools["ajvRoot"], out / "checks/web-runtime-result.json"])

    config = dict(generatorName="kotlin", library="jvm-okhttp4", inputSpec=str(spec), modelPackage="bnbu.cr005.review",
                  apiPackage="bnbu.cr005.review.api", invokerPackage="bnbu.cr005.review.infrastructure",
                  globalProperties=dict(models="", modelDocs="false", modelTests="false", apis="false", apiDocs="false", apiTests="false", supportingFiles="false"),
                  additionalProperties=dict(sourceFolder="src/main/kotlin", dateLibrary="java8", serializationLibrary="gson", collectionType="list", enumPropertyNaming="original", modelMutable="false"),
                  schemaMappings={"MediaAsset_contentType":"kotlin.String?", "MediaAsset_byteSize":"kotlin.Long?", "MediaAsset_checksumSha256":"kotlin.String?",
                                  "MediaAsset_durationMilliseconds":"kotlin.Long?", "MediaAsset_hasAudio":"kotlin.Boolean?", "MediaAsset_widthPixels":"kotlin.Int?",
                                  "MediaAsset_rejectionCode":"MediaFinalizationRejectionCode?"},
                  importMappings={"MediaFinalizationRejectionCode?":"bnbu.cr005.review.MediaFinalizationRejectionCode"})
    for label in ["base-models", "selected-wrappers"]:
        config["outputDir"] = str(out / label)
        if label == "selected-wrappers":
            config["library"] = "jvm-retrofit2"
            config["additionalProperties"]["generateOneOfAnyOfWrappers"] = "true"
            config["globalProperties"]["models"] = ",".join("ReviseEnduranceRuleTableRequest_change" if n == "ReviseEnduranceRuleTableRequestChange" else n for n in WRAPPERS)
        config_path = out / (label + ".config.json")
        config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
        run("09-" + label, [java, "-jar", tools["generatorJar"], "generate", "-c", config_path])
    rel = Path("src/main/kotlin/bnbu/cr005/review")
    base, selected, mixed = out / "base-models" / rel, out / "selected-wrappers" / rel, out / "models"
    mixed.mkdir()
    assert len(list(base.glob("*.kt"))) == 196
    assert {p.stem for p in selected.glob("*.kt")} == set(WRAPPERS)
    for p in base.glob("*.kt"): shutil.copyfile(p, mixed / p.name)
    for p in selected.glob("*.kt"): shutil.copyfile(p, mixed / p.name)
    manifest = [{"file": p.name, "source": str((selected / p.name if p.stem in WRAPPERS else base / p.name).relative_to(out)), "sha256": digest(p)} for p in sorted(mixed.glob("*.kt"))]
    (out / "model-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    compiler_cp = os.pathsep.join(tools["kotlinCompilerClasspath"])
    model_cp = os.pathsep.join(tools["modelClasspath"])
    model_jar = out / "models.jar"
    compiler_args = ["-no-stdlib", "-no-reflect", "-jvm-target", "17", "-classpath", model_cp, "-d", str(model_jar)] + [str(p) for p in sorted(mixed.glob("*.kt"))]
    argfile = out / "compile.args"
    argfile.write_text("\n".join('"' + x.replace("\\", "/") + '"' for x in compiler_args) + "\n", encoding="utf-8")
    run("10-kotlin-compile", [java, "-cp", compiler_cp, "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)])
    classes = out / "jvm-classes"
    classes.mkdir()
    runtime_cp = model_cp + os.pathsep + str(model_jar)
    run("11-jvm-probe-compile", [javac, "-encoding", "UTF-8", "--release", "17", "-cp", runtime_cp, "-d", classes,
                                 src / "kotlin/ClosedFieldGuardFactory.java", src / "kotlin/RunCases.java"])
    run("12-kotlin-runtime", [java, "-cp", runtime_cp + os.pathsep + str(classes), "RunCases", out / "checks/runtime-input.json", out / "checks/kotlin-runtime-result.json"])
    run("13-lint", [node, modules / "@redocly/cli/bin/cli.js", "lint", spec, "--config", repo / "contracts/redocly.yaml"])
    python = json.loads((out / "checks/python-result.json").read_text(encoding="utf-8"))
    web = json.loads((out / "checks/web-runtime-result.json").read_text(encoding="utf-8"))
    kotlin = json.loads((out / "checks/kotlin-runtime-result.json").read_text(encoding="utf-8"))
    assert python["passed"] == python["caseCount"] == web["passed"] == web["total"] == kotlin["passed"] == kotlin["total"] == 59
    assert python["mutationsRejected"] == python["mutationCount"] == 39
    assert web["roundtrips"] == kotlin["roundtrips"] == 7
    assert digest(spec) == CANDIDATE_SHA and digest(args.baseline_contracts / "openapi.yaml") == BASELINE_SHA
    result = dict(status="STEP_2_IMPLEMENTATION_VERIFIED", candidate=candidate_identity, versions=versions,
                  protocolCases=59, webRuntimeCases=59, kotlinRuntimeCases=59, integrityMutations=39,
                  generatedTypeLegalBranches=7, generatedTypeNegativeAssertions=28, kotlinModels=196, wrapperModels=14,
                  commandCount=len(logs), allCommandsMetExpectedExit=True,
                  commandsExitZero=sum(r["exitCode"] == 0 for r in logs),
                  rcReadiness="EXPECTED_BLOCKED_DRAFT_NOT_A_PASS", originalRcSnapshotUnchanged=True,
                  owner="用户", reviewer="用户", review="USER_ACCEPTED_SCOPE_AND_APPROACH",
                  android="ACCEPTED_SCOPED_VALIDATION_APPROACH_PHASE6_AND_PHASE8_PENDING",
                  backend="NOT_RUN_SCHEDULED_PHASE7_0_EXIT_GATE", backendTrackingId="BE-CR005-COMPAT",
                  formalRc="NOT_RELEASED", step2="DONE_LOCAL_SCOPE", phase5="IN_PROGRESS", nextStep="STOP_BEFORE_STEP_3")
    (out / "result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k not in {"candidate", "versions"}}, ensure_ascii=False, indent=2))


if __name__ == "__main__": main()
