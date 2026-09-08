"""Install a sealed validation test APK and audit actual Android instrumentation outcomes."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

from contract_entry import require, sha, write_json

PACKAGE = 'edu.bnbu.student.contractvalidation.test'
RUNNER = PACKAGE + '/androidx.test.runner.AndroidJUnitRunner'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--build-evidence', type=Path, required=True)
    p.add_argument('--android-sdk', type=Path, required=True)
    p.add_argument('--serial', required=True)
    p.add_argument('--evidence', type=Path, required=True)
    p.add_argument('--suite', choices=['smoke', 'ui', 'full'], default='smoke')
    a = p.parse_args()
    repo = Path(__file__).resolve().parents[3]
    out = a.evidence.resolve()
    require(not out.is_relative_to(repo), 'Device evidence must be outside source repo')
    require(re.fullmatch(r'[A-Za-z0-9_.:-]+', a.serial) is not None, 'Invalid serial')
    out.mkdir(parents=True, exist_ok=False)
    build = json.loads((a.build_evidence / 'result.json').read_text('utf8'))
    require(build['status'] == 'PASS_STEP5_SELF_CHECK', 'Require passing build/schema/mapper/Mock evidence')
    for path, digest in build['sourceFiles'].items():
        require(sha(repo / path) == digest, 'Source differs from built APK: ' + path)
    def sources():
        return {str(f.relative_to(repo)).replace('\\','/'): sha(f)
            for root in [repo/'BNBU-ANDROID/contract-validation', repo/'BNBU-ANDROID/tools/phase6']
            for f in root.rglob('*') if f.is_file() and 'build' not in f.relative_to(root).parts and '__pycache__' not in f.parts}
    before = sources()
    extras = set(before)-set(build['sourceFiles'])
    require(extras <= {'BNBU-ANDROID/tools/phase6/run_step06.py'}, 'Unbuilt source additions: ' + repr(extras))
    write_json(out/'source-before.json',before)
    apk = a.build_evidence/'contract-validation-debug-androidTest.apk'
    require(sha(apk) == build['mockCoverage']['androidTestApkSha256'], 'APK seal changed')
    adb = a.android_sdk/'platform-tools/adb.exe'
    commands=[]

    def run(name, args, timeout=45):
        command=[str(adb),'-s',a.serial,*args]
        start=datetime.now(timezone.utc).isoformat()
        r=subprocess.run(command,capture_output=True,text=True,encoding='utf8',errors='replace',timeout=timeout)
        (out/(name+'.log')).write_text(r.stdout+r.stderr,encoding='utf8')
        commands.append(dict(name=name,command=command,startedAt=start,finishedAt=datetime.now(timezone.utc).isoformat(),exitCode=r.returncode))
        write_json(out/'commands.json',commands)
        require(r.returncode==0, 'Failed command: '+name)
        return r.stdout

    require(run('01-boot',['shell','getprop','sys.boot_completed']).strip()=='1', 'Wait for Android boot completion')
    properties={}
    for name in ['ro.build.version.sdk','ro.build.version.release','ro.build.version.codename','ro.build.fingerprint',
                 'ro.product.model','ro.product.cpu.abi','ro.kernel.qemu']:
        properties[name]=run('property-'+name,['shell','getprop',name]).strip()
    require(int(properties['ro.build.version.sdk'])>=26, 'Device is below declared minSdk')
    properties['pageSize']=run('page-size',['shell','getconf','PAGESIZE']).strip()
    properties['display']=run('display',['shell','wm','size']).strip()
    write_json(out/'device.json',dict(serial=a.serial,properties=properties))
    install=run('02-install',['install','-r','-t',str(apk)],timeout=180)
    require('Success' in install, 'APK installation did not report Success')
    installed=run('03-installed-path',['shell','pm','path',PACKAGE]).strip()
    require(installed.startswith('package:/data/app/') and installed.endswith('/base.apk') and '\n' not in installed, 'Unexpected installed path')
    run('04-pull-installed',['pull',installed.removeprefix('package:'),str(out/'installed-test.apk')],timeout=120)
    require(sha(out/'installed-test.apk')==sha(apk),'Installed APK differs from reviewed test APK')
    classes='Phase6MockRetryUiTest' if a.suite=='smoke' else 'Phase6MockUiTest,Phase6MockRetryUiTest'
    expected=1 if a.suite=='smoke' else build['mockCoverage']['pageScenarios']+1
    if a.suite=='full':
        classes+=',Phase6DeviceBoundaryTest,Phase6DeviceSchemaTest'
        expected+=build['mockCoverage']['boundaryCases']+2
    print('Running actual Android '+a.suite+' tests on '+a.serial,flush=True)
    output=run('05-instrumentation',['shell','am','instrument','-w','-r','-e','class',classes,RUNNER],timeout=600)
    # am instrument can return shell exit0 on test failures or process crashes. Parse actual test events.
    events=[]; fields={}; last=None
    for line in output.splitlines():
        m=re.match(r'INSTRUMENTATION_STATUS: ([^=]+)=(.*)',line)
        if m: fields[m[1]]=m[2]; last=m[1]
        elif line.startswith('INSTRUMENTATION_STATUS_CODE:'):
            code=int(line.split(':',1)[1]); events.append(dict(code=code,**fields)); fields={}; last=None
        elif last and not line.startswith('INSTRUMENTATION_'): fields[last]+='\n'+line
    completed=[e for e in events if e['code'] in [0,-1,-2,-3,-4] and 'test' in e]
    passed=[e for e in completed if e['code']==0]
    failed=[e for e in completed if e['code']!=0]
    ok=(len(passed)==expected and not failed and len({(e.get('class'),e['test']) for e in passed})==expected
        and re.search(r'OK \('+str(expected)+r' tests?\)',output) is not None
        and 'INSTRUMENTATION_FAILED' not in output and 'Process crashed' not in output)
    after=sources()
    require(after==before,'Source changed during device tests')
    result=dict(status='PASS_ANDROID_DEVICE_TESTS' if ok else 'FAIL_ANDROID_DEVICE_TESTS',suite=a.suite,
        expected=expected,passed=len(passed),failed=len(failed),events=events,completed=completed,
        contract=build['contract'],apkSha256=sha(apk),sourceFiles=before,serial=a.serial,
        sourceBuildResultSha256=sha(a.build_evidence/'result.json'),commands=commands,
        notRun=['Physical device' if properties['ro.kernel.qemu']=='1' else 'Other Android versions','Backend','Web','6C acceptance','GitHub'])
    write_json(out/'result.json',result)
    suite=ET.Element('testsuite',name='Android-'+a.suite,tests=str(len(completed)),failures=str(len(failed)))
    for event in completed:
        case=ET.SubElement(suite,'testcase',classname=event.get('class',''),name=event['test'])
        if event['code']!=0: ET.SubElement(case,'failure',message=event.get('stack','Failed')).text=event.get('stack','')
    ET.ElementTree(suite).write(out/'junit.xml',encoding='utf8',xml_declaration=True)
    # Each successful UI/schema test writes its own deterministic evidence file before teardown.
    run('07-pull-device-evidence',['pull',f'/sdcard/Android/data/{PACKAGE}/files/phase6-device',str(out/'device-files')],timeout=120)
    if a.suite=='full' and ok:
        for name,count,legal in [('schema',992,159),('supplemental',164,127)]:
            r=json.loads((out/'device-files'/f'{name}-result.json').read_text('utf8'))
            require(r['total']==r['passed']==count and r['roundtrips']==legal, 'Android corpus result mismatch')
            require(r['candidateSha256']==build['contract']['sha256'], 'Android corpus changed Contract')
    run('06-runtime-errors',['logcat','-d','-v','threadtime','AndroidRuntime:E','TestRunner:I','*:S'])
    print(f'Android {a.suite}: {len(passed)}/{expected} PASS, {len(failed)} failed. Evidence: {out}',flush=True)
    require(ok,'Actual Android tests failed or were not all executed; diagnose before retrying')


if __name__=='__main__': main()
