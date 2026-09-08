"""Read-only consumption of Phase5 inputs; writes only this module's build directory.

Generation recipe adapted from the hash-bound step06_final/reproduce.py. Model package,
non-date mappings, both generator libraries and the 26 selected wrappers are unchanged.
The client profile uses lossless date strings (F6A-03-01); the Contract is unchanged.
The full Phase5 reproduction runner is deliberately not invoked: it rebuilds contracts.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

import yaml


WRAPPERS = [
    'AddEnduranceRuleIntervalChange', 'CertificationDetails', 'CertificationKind',
    'CreateCertificationApplicationRequest', 'CreateExemptionApplicationRequest',
    'CreateStudentApplicationRequest', 'DeleteEnduranceRuleIntervalChange',
    'EnterMaintenanceRequest', 'MaintenanceAnnouncement', 'ReturnNormalRequest',
    'ReviseEnduranceRuleTableRequest', 'ReviseEnduranceRuleTableRequestChange',
    'SwitchSystemModeRequest', 'UpdateEnduranceRuleIntervalChange',
    'SubmitExerciseRecordRequest', 'SubmitOrdinaryExerciseRecordRequest',
    'SubmitSwimmingExerciseRecordRequest', 'SubmitOfflineSwimmingExerciseRecordRequest',
    'AppendRecordReviewRequest', 'PassExerciseRecordRequest', 'ReturnExerciseRecordRequest',
    'InvalidateExerciseRecordRequest', 'CorrectExerciseRecordReviewRequest',
    'CorrectExerciseRecordValidRequest', 'CorrectExerciseRecordInvalidRequest', 'MaterialManifestItem',
]
FACTORIES = ['CreateStudentApplicationRequest', 'ReviseEnduranceRuleTableRequestChange',
             'ReviseEnduranceRuleTableRequest', 'SwitchSystemModeRequest',
             'SubmitExerciseRecordRequest', 'AppendRecordReviewRequest', 'CorrectExerciseRecordReviewRequest']
SMOKE_CASES = [
    'old-mapping/EXEMPTION/legal', 'old-mapping/CERTIFICATION/legal',
    'prior-workflow/ordinary/valid', 'prior-workflow/swimming/valid', 'prior-workflow/offline/valid',
    'prior-workflow/record/full_pending_response', 'checks/wire/StudentNotification',
    'checks/wire/StudentDashboard',
    'old-mapping/EXEMPTION/unknown', 'old-mapping/EXEMPTION/schema_name',
    'old-mapping/EXEMPTION/null', 'old-mapping/EXEMPTION/numeric',
    'old-mapping/EXEMPTION/missing', 'old-mapping/EXEMPTION/wrong_branch_shape',
    'prior-workflow/ordinary/valid/extra',
    'prior-workflow/ordinary/valid/expectedSessionVersion/1',
    'prior-workflow/record/full_pending_response/missing/currentMaterial',
]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require(condition, message):
    # Explicit checks also work under python -O.
    if not condition:
        raise ValueError(message)


def write_json(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def check_identity(spec_path, metadata_path, lock):
    require(sha(spec_path) == lock['sha256'], 'Contract raw SHA-256 mismatch')
    raw = Path(spec_path).read_bytes()
    require(b'\r' not in raw, 'Contract must retain LF bytes')
    spec = yaml.safe_load(raw)
    require(spec['info']['version'] == lock['version'], 'Contract Version mismatch')
    require(spec['info']['x-contract-status'] == lock['status'], 'Contract Status mismatch')
    metadata = json.loads(Path(metadata_path).read_text(encoding='utf-8'))
    require((metadata['contractVersion'], metadata['contractStatus'], metadata['openapiSha256']) ==
            (lock['version'], lock['status'], lock['sha256']), 'Metadata identity mismatch')
    return spec


def check_generator(jar, template_manifest):
    manifest = json.loads(template_manifest.read_text(encoding='utf-8'))
    require(sha(jar) == manifest['jarSha256'], 'Generator jar SHA-256 mismatch')


def verify(repo, jar, runtime):
    lock = json.loads((repo / 'BNBU-ANDROID/contract-validation/contract-lock.json').read_text('utf-8'))
    spec = check_identity(repo / 'contracts/openapi.yaml', repo / 'contracts/contract-metadata.json', lock)
    for name, expected in lock['inputs'].items():
        require(sha(repo / name) == expected, 'Published input changed: ' + name)
    final = repo / 'contracts/validation/step06_final'
    check_generator(jar, final / 'template-manifest.json')
    module_spec = importlib.util.spec_from_file_location('phase5_generator_support', final / 'generator_support.py')
    support = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(support)
    support.check_template(final, jar)
    for entry in json.loads((final / 'runtime-dependencies.json').read_text('utf-8')):
        if entry['file'].endswith('.jar'):
            require(sha(runtime / entry['file']) == entry['sha256'], 'Runtime jar mismatch: ' + entry['file'])
    return lock, spec, support


def model_hashes(directory):
    return {p.name: sha(p) for p in sorted(directory.glob('*.kt'))}


def require_same_models(first, second):
    require(bool(first) and first == second, 'Repeated model generation differs')


def prepare_probe(source, destination):
    # Android's compileSdk35 Java stubs omit Files.readString/writeString, including
    # for host tests. Port only these two file-I/O expressions to Java8 equivalents.
    # The schema/DTO/branch/presence assertions remain the published body. Only the
    # date-time format implementation and host-test failure signaling are adapted too.
    text = source.read_text(encoding='utf-8')
    replacements = {
        'Files.readString(Path.of(args[0]))':
            'new String(Files.readAllBytes(Path.of(args[0])), java.nio.charset.StandardCharsets.UTF_8)',
        'Files.writeString(Path.of(args[1]),new GsonBuilder().setPrettyPrinting().create().toJson(report)+"\\n");':
            'Files.write(Path.of(args[1]),(new GsonBuilder().setPrettyPrinting().create().toJson(report)+"\\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));',
        'withEvaluatorFactory(new FormatEvaluatorFactory())':
            'withEvaluatorFactory(new Phase6FormatEvaluatorFactory())',
        'System.exit(1);':
            'throw new AssertionError("Generated model corpus contains failures");',
    }
    for before, after in replacements.items():
        require(text.count(before) == 1, 'Published probe I/O changed; inspect adaptation')
        text = text.replace(before, after)
    destination.write_text(text, encoding='utf-8', newline='\n')
    return dict(sourceSha256=sha(source), adaptedSha256=sha(destination),
                changes='Two Java8 file-I/O expressions; strict RFC3339/int32/int64 format implementation; test failure throws instead of killing JUnit. Schema/branch/roundtrip assertions unchanged.',
                replacements=replacements)


def recipe(repo, jar, java, out, spec, support):
    final = repo / 'contracts/validation/step06_final'
    profile_path = repo / 'BNBU-ANDROID/contract-validation/generation-profile.json'
    profile = json.loads(profile_path.read_text('utf-8'))
    require(profile['dateLibrary'] == 'string', 'Unexpected client date profile')
    config = dict(generatorName='kotlin', library='jvm-okhttp4', inputSpec=str(repo / 'contracts/openapi.yaml'),
                  modelPackage='bnbu.cr005.review', apiPackage='bnbu.cr005.review.api',
                  invokerPackage='bnbu.cr005.review.infrastructure',
                  globalProperties=dict(models='', modelDocs='false', modelTests='false', apis='false',
                                        apiDocs='false', apiTests='false', supportingFiles='false'),
                  additionalProperties=dict(sourceFolder='src/main/kotlin', dateLibrary=profile['dateLibrary'],
                                            serializationLibrary='gson', collectionType='list',
                                            enumPropertyNaming='original', modelMutable='false'),
                  schemaMappings={'MediaAsset_contentType': 'kotlin.String?', 'MediaAsset_byteSize': 'kotlin.Long?',
                                  'MediaAsset_checksumSha256': 'kotlin.String?', 'MediaAsset_durationMilliseconds': 'kotlin.Long?',
                                  'MediaAsset_hasAudio': 'kotlin.Boolean?', 'MediaAsset_widthPixels': 'kotlin.Int?',
                                  'MediaAsset_rejectionCode': 'MediaFinalizationRejectionCode?'},
                  importMappings={'MediaFinalizationRejectionCode?': 'bnbu.cr005.review.MediaFinalizationRejectionCode'})
    mappings, imports = support.nullable_scalar_mappings(spec)
    mappings = {name: 'kotlin.String?' if target in ['java.time.OffsetDateTime?', 'java.time.LocalDate?'] else target
                for name, target in mappings.items()}
    config['schemaMappings'].update(mappings)
    config['importMappings'].update(imports)
    commands = []
    for label in ['base-models', 'selected-wrappers']:
        config['outputDir'] = str(out / label)
        if label == 'selected-wrappers':
            config['library'] = 'jvm-retrofit2'
            config['additionalProperties']['generateOneOfAnyOfWrappers'] = 'true'
            config['templateDir'] = str(final / 'templates')
            config['globalProperties']['models'] = ','.join(
                'ReviseEnduranceRuleTableRequest_change' if n == 'ReviseEnduranceRuleTableRequestChange' else n for n in WRAPPERS)
        path = out / (label + '.config.json')
        write_json(path, config)
        command = [str(java), '-jar', str(jar), 'generate', '-c', str(path)]
        started = datetime.now(timezone.utc).isoformat()
        process = subprocess.run(command, cwd=repo, capture_output=True, text=True, encoding='utf-8', errors='replace')
        (out / (label + '.log')).write_text(process.stdout + process.stderr, encoding='utf-8')
        commands.append(dict(command=command, cwd=str(repo), startedAt=started, exitCode=process.returncode))
        write_json(out / 'commands.json', commands)
        require(process.returncode == 0, 'Generator failed; see ' + str(out / (label + '.log')))
    rel = Path('src/main/kotlin/bnbu/cr005/review')
    base, selected = out / 'base-models' / rel, out / 'selected-wrappers' / rel
    require({p.stem for p in selected.glob('*.kt')} == set(WRAPPERS), 'Selected wrapper set differs')
    mixed = out / 'models'
    mixed.mkdir()
    for source in [base, selected]:
        for path in source.glob('*.kt'):
            shutil.copyfile(path, mixed / path.name)
    hashes = model_hashes(mixed)
    require(len(hashes) == 324, 'Generated model count differs from published recipe')
    write_json(out / 'model-manifest.json', hashes)
    return mixed, hashes


def generate(repo, jar, runtime, java, output):
    lock, spec, support = verify(repo, jar, runtime)
    profile_path = repo / 'BNBU-ANDROID/contract-validation/generation-profile.json'
    profile_sha = sha(profile_path)
    allowed = (repo / 'BNBU-ANDROID/contract-validation/build/generated/phase6').resolve()
    require(output.resolve() == allowed, 'Output must be this module\'s generated build directory')
    output.mkdir(parents=True, exist_ok=True)
    # Preserve each invocation and its logs. Never delete old evidence or reuse generated models.
    run = Path(tempfile.mkdtemp(prefix='run-', dir=output))
    first, second = run / 'first', run / 'second'
    first.mkdir()
    second.mkdir()
    models, hashes = recipe(repo, jar, java, first, spec, support)
    _, repeat_hashes = recipe(repo, jar, java, second, spec, support)
    require_same_models(hashes, repeat_hashes)
    verify(repo, jar, runtime)  # Recheck inputs after both generator processes.
    require(profile_sha == sha(profile_path), 'Client profile changed during generation')
    target = output / 'models'
    target.mkdir(exist_ok=True)
    for stale in target.glob('*.kt'):
        require(stale.name in hashes, 'Unexpected stale generated model: ' + stale.name)
    for path in models.glob('*.kt'):
        shutil.copyfile(path, target / path.name)
    require(model_hashes(target) == hashes, 'Copied models differ from generation output')
    probe = output / 'probe'
    probe.mkdir(exist_ok=True)
    probe_adaptation = prepare_probe(repo / 'contracts/validation/step06_final/jvm/ContractRuntimeProbe.java',
                                    probe / 'ContractRuntimeProbe.java')
    fixtures = json.loads((repo / 'contracts/validation/step07_handoff/fixtures.json').read_text('utf-8'))
    require(fixtures['candidateSha256'] == lock['sha256'], 'Fixture identity mismatch')
    indexed = {row['name']: row for row in fixtures['cases']}
    cases = [indexed[name] for name in SMOKE_CASES]
    write_json(output / 'smoke-input.json', dict(candidateSha256=lock['sha256'], spec=spec,
               cases=cases, wrapperFactories=FACTORIES, synthetic=True))
    write_json(output / 'generation-result.json', dict(contract=lock, modelHashes=hashes,
               repeatedModelHashes=repeat_hashes, runDirectory=str(run), modelCount=len(hashes),
               wrapperCount=len(WRAPPERS), smokeCases=len(cases), generationDeterministic=True,
               probeAdaptation=probe_adaptation, generationProfile=json.loads(profile_path.read_text('utf-8')),
               generationProfileSha256=profile_sha))
    print(f'PASS: {len(hashes)} models, {len(WRAPPERS)} selected wrappers; two fresh generations match.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['verify', 'generate'])
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--generator-jar', type=Path, required=True)
    parser.add_argument('--runtime-dir', type=Path, required=True)
    parser.add_argument('--java', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    if args.action == 'verify':
        verify(args.repo.resolve(), args.generator_jar.resolve(), args.runtime_dir.resolve())
        print('PASS: exact RC, generator, templates, fixture and runtime jar identities.')
    else:
        require(args.java is not None and args.output is not None, 'Generation requires --java and --output')
        generate(args.repo.resolve(), args.generator_jar.resolve(), args.runtime_dir.resolve(), args.java, args.output)


if __name__ == '__main__':
    main()
