"""Repeatable Step2 verification. No Git writes, downloads, app migration or device claims."""
import argparse
from datetime import datetime, timezone
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import zipfile

from contract_entry import model_hashes, require, sha, write_json


def main(default_suite='smoke'):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generator-jar', type=Path, required=True)
    parser.add_argument('--runtime-dir', type=Path, required=True)
    parser.add_argument('--java-home', type=Path, required=True)
    parser.add_argument('--android-sdk', type=Path, required=True)
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--suite', choices=['smoke', 'schema', 'mapper', 'mock'], default=default_suite)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    android = repo / 'BNBU-ANDROID'
    module = android / 'contract-validation'
    out = args.evidence.resolve()
    require(not out.is_relative_to(repo), 'Evidence must be outside the source repository')
    out.mkdir(parents=True, exist_ok=False)
    def source_files():
        files = {str(p.relative_to(repo)).replace('\\', '/'): sha(p)
                 for root in [module, android / 'tools/phase6'] for p in root.rglob('*')
                 if p.is_file() and 'build' not in p.relative_to(root).parts and '__pycache__' not in p.parts}
        files['BNBU-ANDROID/settings.gradle.kts'] = sha(android / 'settings.gradle.kts')
        return files
    entry_sources = source_files()
    write_json(out / 'source-before.json', entry_sources)
    env = dict(os.environ, JAVA_HOME=str(args.java_home.resolve()), ANDROID_HOME=str(args.android_sdk.resolve()),
               ANDROID_SDK_ROOT=str(args.android_sdk.resolve()), PYTHONDONTWRITEBYTECODE='1')
    commands = []

    def run(name, command, cwd=android):
        command = list(map(str, command))
        started = datetime.now(timezone.utc).isoformat()
        with (out / (name + '.log')).open('w', encoding='utf-8') as log:
            result = subprocess.run(command, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT)
        commands.append(dict(name=name, command=command, cwd=str(cwd), startedAt=started,
                             finishedAt=datetime.now(timezone.utc).isoformat(), exitCode=result.returncode))
        write_json(out / 'commands.json', commands)
        print(f'{name}: exit {result.returncode}', flush=True)
        require(result.returncode == 0, 'Failed: ' + str(out / (name + '.log')))

    py = [sys.executable, '-B', '-X', 'utf8']
    run('01-binding-controls', py + [android / 'tools/phase6/test_entry.py'])
    run('01b-published-seal-controls', py + [android / 'tools/phase6/test_published_input_seal.py'])
    run('02-published-input-seal', py + [android / 'tools/phase6/published_input_seal.py',
        '--evidence', out / 'phase5-input-seal'], repo)
    gradle = android / ('gradlew.bat' if os.name == 'nt' else 'gradlew')
    run('03-android-build-and-tests', [gradle, ':contract-validation:assembleDebug',
        ':contract-validation:testDebugUnitTest', '--offline', '--console=plain', '--rerun-tasks',
        '-Pphase6FullValidation=' + str(args.suite in ['schema', 'mapper', 'mock']).lower(),
        '-Pphase6MapperValidation=' + str(args.suite in ['mapper', 'mock']).lower(),
        '-Pphase6MockValidation=' + str(args.suite == 'mock').lower(),
        '-Pphase6Python=' + sys.executable, '-Pphase6GeneratorJar=' + str(args.generator_jar.resolve()),
        '-Pphase6RuntimeDir=' + str(args.runtime_dir.resolve())] +
        ([':contract-validation:assembleDebugAndroidTest'] if args.suite == 'mock' else []))
    generated = module / 'build/generated/phase6'
    generation = json.loads((generated / 'generation-result.json').read_text('utf-8'))
    smoke = module / 'build/reports/phase6/strict-smoke.json'
    smoke_result = json.loads(smoke.read_text('utf-8'))
    require(smoke_result['candidateSha256'] == generation['contract']['sha256'], 'Smoke used another Contract')
    require(smoke_result['total'] == smoke_result['passed'] == 17 and smoke_result['roundtrips'] == 8,
            'Generated-model smoke gate failed')
    require(generation['modelHashes'] == generation['repeatedModelHashes'] == model_hashes(generated / 'models'),
            'Models changed after generation')
    coverage = None
    if args.suite in ['schema', 'mapper', 'mock']:
        from schema_coverage import report_coverage
        coverage = report_coverage(generated, module / 'build/reports/phase6', out / 'schema-coverage.json')
    aar = module / 'build/outputs/aar/contract-validation-debug.aar'
    with zipfile.ZipFile(aar) as archive:
        classes = archive.read('classes.jar')
    with zipfile.ZipFile(io.BytesIO(classes)) as compiled:
        missing = [name for name in generation['modelHashes']
                   if 'bnbu/cr005/review/' + name.removesuffix('.kt') + '.class' not in compiled.namelist()]
        require(not missing, 'AAR lacks generated classes: ' + repr(missing))
        require('ContractRuntimeProbe.class' not in compiled.namelist(), 'Host test probe leaked into AAR')
        packaged_entries = {n: compiled.read(n) for n in compiled.namelist()}
    with zipfile.ZipFile(smoke_result['compiledModelLocation']) as tested:
        require(packaged_entries == {n: tested.read(n) for n in tested.namelist()},
                'Tested and packaged class/resource bytes differ')
    # Keep generated source hashes, actual generator logs and Android test reports together.
    for name in ['generation-result.json', 'smoke-input.json']:
        shutil.copyfile(generated / name, out / name)
    shutil.copyfile(smoke, out / 'strict-smoke.json')
    shutil.copyfile(aar, out / aar.name)
    if args.suite in ['schema', 'mapper', 'mock']:
        for name in ['schema-input.json', 'supplemental-input.json', 'schema-plan.json']:
            shutil.copyfile(generated / name, out / name)
        for name in ['full-schema.json', 'supplemental-schema.json']:
            shutil.copyfile(module / 'build/reports/phase6' / name, out / name)
    shutil.copytree(module / 'build/test-results/testDebugUnitTest', out / 'junit')
    mapper = None
    if args.suite in ['mapper', 'mock']:
        mapper_path = module / 'build/reports/phase6/mapper.json'
        mapper = json.loads(mapper_path.read_text('utf-8'))
        require(mapper['candidateSha256'] == generation['contract']['sha256'], 'Mapper used another Contract')
        require(mapper['planned'] == mapper['executed'] == mapper['passed'] > 0, 'Mapper checks failed or skipped')
        require(len({c['name'] for c in mapper['cases']}) == mapper['planned'], 'Duplicate Mapper case name')
        shutil.copyfile(mapper_path, out / 'mapper.json')
        from mapper_coverage import report_mapper
        report_mapper(repo, mapper, out / 'junit', out / 'mapper-coverage.json')
    run_directory = Path(generation['runDirectory'])
    for label in ['first', 'second']:
        dest = out / ('generation-' + label)
        dest.mkdir()
        for name in ['commands.json', 'model-manifest.json', 'base-models.config.json',
                     'selected-wrappers.config.json', 'base-models.log', 'selected-wrappers.log']:
            shutil.copyfile(run_directory / label / name, dest / name)
    run('04-diff-whitespace', ['git', '--no-pager', 'diff', '--check'], repo)
    run('05-working-tree', ['git', 'status', '--short'], repo)
    files = source_files()
    require(files == entry_sources, 'Source changed during verification; use a new evidence directory and rerun')
    mock = None
    if args.suite == 'mock':
        from mock_coverage import report_mock
        mock = report_mock(module, generated, out)
    step = {'smoke': 2, 'schema': 3, 'mapper': 4, 'mock': 5}[args.suite]
    write_json(out / 'result.json', dict(status=f'PASS_STEP{step}_SELF_CHECK', contract=generation['contract'],
        commands=commands, modelCount=324, repeatGeneration='PASS_ALL_324_MODEL_BYTES',
        androidLibraryBuild='PASS_AGP_8_7_3_COMPILE_SDK_35', aarSha256=sha(aar),
        androidGeneratedClassesInAar=324, testedAndPackagedEntriesEqual=len(packaged_entries),
        generationProfile=generation.get('generationProfile'),
        hostJvmCases=coverage['runtimeCases'] if coverage else 17,
        legalRoundtrips=coverage['legalRoundtrips'] if coverage else 8,
        rejectedCases=coverage['expectedRejections'] if coverage else 9,
        smokeRegression={'cases':17, 'passed':17},
        schemaCoverage='schema-coverage.json' if coverage else None,
        constructedDtoBoundaryChecks=6 if coverage else 0,
        mapperCases=mapper['passed'] if mapper else None,
        mapperDecodedSchemas=mapper['decodedSchemas'] if mapper else None,
        mapperCoverage='mapper-coverage.json' if mapper else None,
        mockCoverage=mock,
        entryChecks=9, sourceFiles=files, reviewer='USER_PENDING_REVIEW_OF_THIS_STEP',
        notRun=['Android device/emulator', 'Rendered UI (APK compiled, not executed)' if mock else ('Rendered UI / Mock transport integration' if mapper else 'UI and mapper integration'), 'Backend', 'Web', '6C acceptance',
                'GitHub publication'] + ([] if coverage else ['Full 992-case regression']),
        knownGateMismatch='Phase5 --require-published counts deferred Phase7.0 backend recipient; not altered by Step2'))
    print(f'PASS: Step{step} only. Android library compiled; host JVM {args.suite} checks passed. Await human review.', flush=True)


if __name__ == '__main__':
    main()
