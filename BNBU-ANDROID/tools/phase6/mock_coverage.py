"""Audit real JUnit outcomes and the built test APK without implying device execution."""
import json
import shutil
import xml.etree.ElementTree as ET
import zipfile
from contract_entry import sha, require, write_json


def report_mock(module, generated, out):
    source = module / 'build/reports/phase6/mock.json'
    report = json.loads(source.read_text('utf8'))
    plan = json.loads((generated / 'mock-plan.json').read_text('utf8'))
    require(report['candidateSha256'] == plan['contractSha256'], 'Mock input used another Contract')
    require(report['planned'] == report['passed'] == len(report['cases']) > 0, 'Missing Mock scenarios')
    scenarios = ET.parse(out / 'junit/TEST-Phase6MockTest.xml').getroot()
    boundary = ET.parse(out / 'junit/TEST-Phase6MockBoundaryTest.xml').getroot()
    for tree in [scenarios, boundary]:
        require(all(int(tree.attrib.get(k, 0)) == 0 for k in ['failures', 'errors', 'skipped']), 'Mock JUnit failed/skipped')
    require({c.attrib['name'].split('[',1)[1].removesuffix(']') for c in scenarios.findall('testcase')} ==
            {c['name'] for c in report['cases']}, 'JUnit and Mock scenario identities differ')
    apk = module / 'build/outputs/apk/androidTest/debug/contract-validation-debug-androidTest.apk'
    with zipfile.ZipFile(apk) as archive:
        require(archive.read('assets/phase6/mock-input.json') == (generated / 'mock-assets/phase6/mock-input.json').read_bytes(),
            'Device test APK did not package the tested input bytes')
        dex = b''.join(archive.read(n) for n in archive.namelist() if n.endswith('.dex'))
        for name in ['Phase6MockUiTest', 'Phase6MockRetryUiTest', 'StrictMockCodec', 'MockScreenController', 'StudentCourseProgress']:
            require(name.encode() in dex, 'Device test APK lacks ' + name)
    states = sorted({c['state'] for c in report['cases']} | {'LOADING'})
    require(states == sorted(['NORMAL','LOADING','EMPTY','ERROR','FORBIDDEN','MAINTENANCE','RESUME']), 'Seven states incomplete')
    result = dict(status='PASS_HOST_MOCK_AND_ANDROID_TEST_APK_BUILD', contractSha256=plan['contractSha256'],
        pageScenarios=report['passed'], boundaryCases=int(boundary.attrib['tests']), states=states,
        readOnlyCases=sum(c['readOnly'] for c in report['cases']),
        operations=sorted({c['operation'] for c in report['cases']} | {'getSystemMode', 'getRecordMaterial', 'submitExerciseRecordSupplement'}),
        requestTrace='mock.json', androidTestApkSha256=sha(apk), mockInputSha256=plan['inputSha256'],
        deviceTestsExecuted=0, scope='Independent validation screen. Not all 41 production pages; formal app migration remains Phase8.',
        sourceSharedWithAndroid=['StrictMockCodec', 'MockScenarioHarness', 'MockCases'],
        pending='Step6 Android execution, rendering, interaction and runtime compatibility')
    for path in [source, generated / 'mock-plan.json', apk]: shutil.copyfile(path, out / path.name)
    shutil.copyfile(generated / 'mock-assets/phase6/mock-input.json', out / 'mock-input.json')
    write_json(out / 'mock-coverage.json', result)
    return result
