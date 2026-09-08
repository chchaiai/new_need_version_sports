"""Verify sealed Phase5 inputs without treating the live progress page as a new RC.

All immutable inputs are checked from the current checkout. Only STATUS.md is read
from the exact Phase6 entry commit; the original Phase5 verifier runs unmodified
against that explicit snapshot. No Git writes or modifications to the checkout.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

BASE = '2ba9355e38373b8d2350eb8efe4071048337c320'
STATUS = 'docs/rebuild/STATUS.md'
MANIFEST = 'contracts/release-manifest.json'
VERIFIER = 'contracts/validation/step06_final/verify_release.py'

def sha(data): return hashlib.sha256(data).hexdigest()
def original(repo, path):
    return subprocess.check_output(['git','-C',str(repo),'show',BASE+':'+path])

def snapshot(repo, destination, baseline_reader=original):
    if destination.exists() or destination.resolve().is_relative_to(repo.resolve()):
        raise ValueError('Use a new evidence directory outside the repository')
    manifest_bytes=(repo/MANIFEST).read_bytes()
    if manifest_bytes != baseline_reader(repo, MANIFEST):
        raise ValueError('Published manifest differs from the fixed entry commit')
    manifest=json.loads(manifest_bytes)
    files={MANIFEST:manifest_bytes}
    historical=[]
    for section in ['artifacts','generationAndValidationInputs','authorityInputs']:
        for row in manifest[section]:
            name=row['path']
            path=(repo/name).resolve()
            if not path.is_relative_to(repo.resolve()): raise ValueError('Unsafe manifest path')
            data=baseline_reader(repo,name) if name==STATUS else path.read_bytes()
            if sha(data)!=row['sha256']: raise ValueError('Published input changed: '+name)
            files[name]=data
            if name==STATUS:
                historical.append(dict(path=name,sourceCommit=BASE,publishedSha256=sha(data),
                                       currentSha256=sha(path.read_bytes()),
                                       reason='Mutable stage progress, not Contract input; preserve historical release record'))
    required=['contracts/contract-metadata.json',VERIFIER,
              'contracts/validation/step06_final/result.json','contracts/validation/step06_final/disposition.json']
    required += [r['path'] for r in manifest['implementedChangeRequests']]
    for name in required:
        data=(repo/name).read_bytes()
        if name not in files and data!=baseline_reader(repo,name):
            raise ValueError('Unsealed validation dependency changed: '+name)
        files[name]=data
    if not historical: raise ValueError('Expected the historical progress artifact')
    destination.mkdir(parents=True)
    for name,data in files.items():
        p=destination/name; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(data)
    record=dict(baselineCommit=BASE,historicalProgress=historical,
                inputs={n:sha(b) for n,b in sorted(files.items())},
                verifier='Unmodified Phase5 verify_release.py; all checks run on the recorded snapshot')
    (destination/'snapshot-manifest.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf8')
    return record

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--evidence',required=True,type=Path); a=p.parse_args()
    repo=Path(__file__).resolve().parents[3]
    snapshot(repo,a.evidence)
    subprocess.run([sys.executable,'-B','-X','utf8',str(a.evidence/VERIFIER)],check=True)
    print('PASS: immutable current inputs and original progress snapshot verified; live STATUS is not relabeled as a release artifact.')

if __name__=='__main__': main()
